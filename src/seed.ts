import { getPayload } from 'payload'
import config from '@/payload.config'

try {
  const payload = await getPayload({ config })

  console.log('Seeding database...')
  console.log('Creating super admin user if it does not exist...')
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: 'dev@payloadcms.com' } },
    limit: 1,
  })
  let superAdminId: string | undefined =
    existing.docs[0] != null ? String(existing.docs[0].id) : undefined
  if (existing.docs.length === 0) {
    const created = await payload.create({
      collection: 'users',
      data: { username: 'dev', email: 'dev@payloadcms.com', password: 'test', isSuperAdmin: true },
    })
    superAdminId = String(created.id)
  } else {
    console.log('SuperAdmin user already exists, skipping')
  }

  // --- RBAC seed (values snapshotted from live MongoDB) ---
  // Collections provided by @zealamic/payload-plugin-rbac:
  // permission-actions, permission-features, permissions, roles, roles-permissions
  // All lookups are by natural key (code/name) so re-seeds are idempotent
  // and survive fresh DBs with different ObjectIds.

  const findOneBy = async (
    collection: 'permission-actions' | 'permission-features' | 'permissions' | 'roles',
    field: string,
    value: string,
  ) => {
    const res = await payload.find({
      collection,
      where: { [field]: { equals: value } },
      limit: 1,
      depth: 0,
    })
    const doc = res.docs[0] as { id: string | number } | undefined
    return doc != null ? String(doc.id) : undefined
  }

  console.log('Seeding permission-actions...')
  const permissionActionsSeed = [
    { code: 'Create', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Read', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Update', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Delete', type: 'main' as const, sortOrder: 0, status: 'active' as const },
  ]
  const actionIdsByCode: Record<string, string> = {}
  for (const action of permissionActionsSeed) {
    const foundId = await findOneBy('permission-actions', 'code', action.code)
    if (foundId) {
      actionIdsByCode[action.code] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permission-actions',
      data: { ...action, ...(superAdminId ? { createdBy: superAdminId } : {}) },
    })
    actionIdsByCode[action.code] = String(created.id)
  }

  console.log('Seeding permission-features...')
  const permissionFeaturesSeed = [
    { code: 'Museum', sortOrder: 0, status: 'active' as const },
    { code: 'Content', sortOrder: 0, status: 'active' as const },
    { code: 'Object', sortOrder: 0, status: 'active' as const },
    { code: 'Exhibit', sortOrder: 0, status: 'active' as const },
  ]
  const featureIdsByCode: Record<string, string> = {}
  for (const feature of permissionFeaturesSeed) {
    const foundId = await findOneBy('permission-features', 'code', feature.code)
    if (foundId) {
      featureIdsByCode[feature.code] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permission-features',
      data: { ...feature, ...(superAdminId ? { createdBy: superAdminId } : {}) },
    })
    featureIdsByCode[feature.code] = String(created.id)
  }

  console.log('Seeding permissions...')
  const permissionsSeed = [
    { name: 'Read Museum', featureCode: 'Museum', actionCode: 'Read' },
    { name: 'Create Museum', featureCode: 'Museum', actionCode: 'Create' },
    { name: 'Update Museum', featureCode: 'Museum', actionCode: 'Update' },
  ]
  const permissionIdsByName: Record<string, string> = {}
  for (const perm of permissionsSeed) {
    const foundId = await findOneBy('permissions', 'name', perm.name)
    if (foundId) {
      permissionIdsByName[perm.name] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permissions',
      data: {
        name: perm.name,
        permissionFeature: featureIdsByCode[perm.featureCode],
        permissionAction: actionIdsByCode[perm.actionCode],
        sortOrder: 0,
        status: 'active',
        ...(superAdminId ? { createdBy: superAdminId } : {}),
      },
    })
    permissionIdsByName[perm.name] = String(created.id)
  }

  console.log('Seeding roles...')
  const directorPermissions = ['Update Museum', 'Create Museum', 'Read Museum']
  const buildDirectorDraft = () => {
    const draft: Record<string, boolean> = {}
    for (const permName of directorPermissions) {
      const permId = permissionIdsByName[permName]
      if (permId) draft[permId] = true
    }
    return draft
  }
  const rolesSeed = [
    {
      code: 'User',
      name: 'User',
      description: 'A logged in user, who can also create its own content and share it',
      status: 'active' as const,
      dataScope: 'own' as const,
    },
    {
      code: 'Curator',
      name: 'Curator',
      description: 'A museum curator',
      status: 'active' as const,
      dataScope: 'all' as const,
    },
    {
      code: 'Director',
      name: 'Director',
      description: 'A Museum director. He/Her owns the museum',
      status: 'active' as const,
      dataScope: 'all' as const,
    },
  ]
  const roleIdsByCode: Record<string, string> = {}
  for (const role of rolesSeed) {
    const foundId = await findOneBy('roles', 'code', role.code)
    if (foundId) {
      roleIdsByCode[role.code] = foundId
      // Keep Director's permissionMatrixDraft in sync on re-seed (triggers
      // syncPermissionMatrixDraftAfterChange -> roles-permissions rows)
      if (role.code === 'Director') {
        await payload.update({
          collection: 'roles',
          id: foundId,
          data: { permissionMatrixDraft: buildDirectorDraft() },
        })
      }
      continue
    }
    const created = await payload.create({
      collection: 'roles',
      data: {
        ...role,
        ...(role.code === 'Director' ? { permissionMatrixDraft: buildDirectorDraft() } : {}),
        ...(superAdminId ? { createdBy: superAdminId } : {}),
      },
    })
    roleIdsByCode[role.code] = String(created.id)
  }

  // roles-permissions rows are auto-synced from roles.permissionMatrixDraft by
  // the plugin's syncPermissionMatrixDraftAfterChange hook, but ensure the
  // Director rows exist in case hooks were bypassed.
  console.log('Seeding roles-permissions...')
  const directorRoleId = roleIdsByCode['Director']
  if (directorRoleId) {
    for (const permName of directorPermissions) {
      const permId = permissionIdsByName[permName]
      if (!permId) continue
      const res = await payload.find({
        collection: 'roles-permissions',
        where: {
          and: [{ role: { equals: directorRoleId } }, { permission: { equals: permId } }],
        },
        limit: 1,
        depth: 0,
      })
      if (res.docs.length === 0) {
        await payload.create({
          collection: 'roles-permissions',
          data: { role: directorRoleId, permission: permId, enabled: true },
        })
      }
    }
  }

  console.log('Database seeded successfully. Closing connection...')
  await payload.destroy()
  console.log('Payload connection closed. Exiting process.')
  process.exit(0)
} catch (e) {
  console.error('Error seeding database:', e)
  process.exit(1)
}
