import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
} from '@/fields/MuseumFunction'
import config from '@/payload.config'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'
import { mockMuseumFull } from './mocks/museum.mock'

const editorDefaultConfig = await editorConfigFactory.default({
  config: await config, // Your Payload Config
})

const htmlToRichText = (html: string) =>
  convertHTMLToLexical({
    editorConfig: editorDefaultConfig,
    JSDOM,
    html,
  })

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
      data: {
        username: 'dev',
        email: 'dev@payloadcms.com',
        password: 'test',
        isSuperAdmin: true,
        name: { firstName: 'Dev', lastName: 'Admin', fullName: 'Dev Admin' },
      },
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
  // Basic CRUD operations for every collection managed by the RBAC plugin
  // (payloadPluginRBAC targetCollections): museums, objects, exhibits, contents.
  // Feature codes below mirror the live DB values ('Museum', 'Content', ...).
  const crudFeatures = ['Museum', 'Content', 'Object', 'Exhibit']
  const crudActions = ['Create', 'Read', 'Update', 'Delete']
  const permissionsSeed = crudFeatures.flatMap((featureCode) =>
    crudActions.map((actionCode) => ({
      name: `${actionCode} ${featureCode}`,
      featureCode,
      actionCode,
    })),
  )
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
  // Director owns the museum: grant the full CRUD matrix. Curator/User get no
  // permissions by default; assign them via the admin UI as needed.
  const directorPermissions = permissionsSeed.map((perm) => perm.name)
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
      museumFunction: MUSEUM_FUNCTION_NONE,
    },
    {
      code: 'Curator',
      name: 'Curator',
      description: 'A museum curator',
      status: 'active' as const,
      dataScope: 'all' as const,
      museumFunction: MUSEUM_FUNCTION_CURATOR,
    },
    {
      code: 'Director',
      name: 'Director',
      description: 'A Museum director. He/Her owns the museum',
      status: 'active' as const,
      dataScope: 'all' as const,
      museumFunction: MUSEUM_FUNCTION_DIRECTOR,
    },
  ]
  const roleIdsByCode: Record<string, string> = {}
  for (const role of rolesSeed) {
    const foundId = await findOneBy('roles', 'code', role.code)
    if (foundId) {
      roleIdsByCode[role.code] = foundId
      // Keep the museum function in sync on re-seed (same policy as
      // Director's permissionMatrixDraft below): the seed owns the mapping
      // between system roles and museum functions.
      await payload.update({
        collection: 'roles',
        id: foundId,
        data: {
          museumFunction: role.museumFunction,
          ...(role.code === 'Director' ? { permissionMatrixDraft: buildDirectorDraft() } : {}),
        },
      })
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

  // --- MCP dev API key (payload-mcp-api-keys) ---
  // Seeds a single `dev-mcp` key from PAYLOAD_MCP_KEY for local development.
  // Verification uses HMAC_SHA256(PAYLOAD_SECRET, rawKey) -> apiKeyIndex, so the
  // same PAYLOAD_SECRET must be used at seed time and at runtime. Passing the
  // plaintext `apiKey` + `enableAPIKey: true` to payload.create triggers the
  // standard encrypt/index hooks, same as Admin UI creation. Local API runs
  // with overrideAccess (bypass), which is required to set the `user` field
  // (create:false in the plugin collection).
  // Policy: missing env -> skip; existing `dev-mcp` label -> skip (no rotation).
  // Admin UI is source of truth for rotation; sync .env manually afterwards.
  console.log('Seeding MCP dev API key...')
  const rawMcpKey = process.env.PAYLOAD_MCP_KEY?.trim()
  if (!rawMcpKey) {
    console.log('PAYLOAD_MCP_KEY not set, skipping MCP key seed')
  } else if (!superAdminId) {
    console.log('SuperAdmin user missing, skipping MCP key seed')
  } else {
    const existingMcpKey = await payload.find({
      collection: 'payload-mcp-api-keys',
      where: { label: { equals: 'dev-mcp' } },
      limit: 1,
      depth: 0,
    })
    if (existingMcpKey.docs.length > 0) {
      console.log('MCP dev key already exists, skipping')
    } else {
      await payload.create({
        collection: 'payload-mcp-api-keys',
        data: {
          user: superAdminId,
          label: 'dev-mcp',
          description: 'Development MCP key (find+create on mcp-enabled collections)',
          museums: { find: true, create: true, update: false, delete: false },
          objects: { find: true, create: true, update: false, delete: false },
          exhibits: { find: true, create: true, update: false, delete: false },
          contents: { find: true, create: true, update: false, delete: false },
          enableAPIKey: true,
          apiKey: rawMcpKey,
        },
      })
      console.log('MCP dev key created')
    }
  }

  // --- Typesense demo data: museums + users ---
  // Created through Payload (not straight into Typesense) so the typesense
  // plugin hooks sync them to Typesense Cloud — this exercises the same path
  // as creating docs from the admin panel. The plugin only indexes
  // `searchFields` (museums: name/location, users: name/description); docs
  // with all of those empty are skipped, hence the fields below.
  // All lookups are by natural key (name/email) so re-seeds are idempotent.
  console.log('Seeding demo museums...')
  const demoMuseums = [
    mockMuseumFull,
    {
      name: 'Galleria Borghese',
      shortDescription: 'Baroque masterpieces in a Roman villa',
      description: htmlToRichText('Bernini sculptures and Caravaggio paintings in Villa Borghese.'),
      location: {
        address: 'Piazzale Scipione Borghese 5',
        city: 'Roma',
        latlng: [12.4922, 41.9142] as [number, number],
      },
      accessibility: true,
      ticketInfo: {
        label: 'Standard ticket',
        url: 'https://www.galleriaborghese.beniculturali.it/en/tickets',
      },
    },
    {
      name: 'Palazzo Reale di Milano',
      shortDescription: 'Grand exhibitions in the heart of Milan',
      description: htmlToRichText('Major international exhibitions next to the Duomo.'),
      location: {
        address: 'Piazza del Duomo 12',
        city: 'Milano',
        latlng: [9.1917, 45.4636] as [number, number],
      },
      accessibility: true,
      ticketInfo: {
        label: 'Standard ticket',
      },
    },
    {
      name: 'Museo Galileo',
      shortDescription: 'History of science in Florence',
      description: htmlToRichText('Scientific instruments from Galileo and the Medici era.'),
      location: {
        address: 'Piazza dei Giudici 1',
        city: 'Firenze',
        latlng: [11.476, 43.7679] as [number, number],
      },
      accessibility: true,
      ticketInfo: {
        label: 'Standard ticket',
      },
    },
    {
      name: 'Museo Archeologico Nazionale di Napoli',
      shortDescription: 'Roman antiquities from Pompeii',
      description: htmlToRichText('Farnese collection and finds from Pompeii and Herculaneum.'),
      location: {
        address: 'Piazza Museo 19',
        city: 'Napoli',
        latlng: [14.1245, 40.8533] as [number, number],
      },
      accessibility: true,
      ticketInfo: {
        label: 'Standard ticket',
      },
    },
    {
      name: 'Palazzo Ducale di Venezia',
      shortDescription: 'Gothic palace of the Doges',
      description: htmlToRichText('Tintoretto ceilings and the Bridge of Sighs.'),
      location: {
        address: 'Piazza San Marco 1',
        city: 'Venezia',
        latlng: [12.3358, 45.4346] as [number, number],
      },
      accessibility: true,
      ticketInfo: {
        label: 'Standard ticket',
      },
    },
  ] satisfies RequiredDataFromCollectionSlug<'museums'>[]
  for (const museum of demoMuseums) {
    const found = await payload.find({
      collection: 'museums',
      where: { name: { equals: museum.name } },
      limit: 1,
      depth: 0,
    })
    if (found.docs.length > 0) {
      console.log(`Museum "${museum.name}" already exists, skipping`)
      continue
    }
    await payload.create({
      collection: 'museums',
      data: museum,
    })
    console.log(`Museum "${museum.name}" created`)
  }

  console.log('Seeding demo users...')
  const demoUsers = [
    {
      username: 'davide',
      email: 'davide@example.com',
      password: 'test-password',
      name: {
        firstName: 'Davide',
        lastName: 'Bianchi',
        fullName: 'Davide Bianchi',
      },
      bio: 'Street art guide in Turin',
      description: 'Street art guide in Turin',
    },
    {
      username: 'chiara',
      email: 'chiara@example.com',
      password: 'test-password',
      name: {
        firstName: 'Chiara',
        lastName: 'Moretti',
        fullName: 'Chiara Moretti',
      },
      bio: 'Modern sculpture enthusiast from Bologna',
      description: 'Modern sculpture enthusiast from Bologna',
    },
    {
      username: 'luca',
      email: 'luca@example.com',
      password: 'test-password',
      name: {
        firstName: 'Luca',
        lastName: 'Ferrari',
        fullName: 'Luca Ferrari',
      },
      bio: 'Museum volunteer and audio guide narrator',
      description: 'Museum volunteer and audio guide narrator',
    },
    {
      username: 'anna',
      email: 'anna@example.com',
      password: 'test-password',
      name: {
        firstName: 'Anna',
        lastName: 'Rossi',
        fullName: 'Anna Rossi',
      },
      bio: 'Baroque painting scholar in Naples',
      description: 'Baroque painting scholar in Naples',
    },
    {
      username: 'paolo',
      email: 'paolo@example.com',
      password: 'test-password',
      name: {
        firstName: 'Paolo',
        lastName: 'Greco',
        fullName: 'Paolo Greco',
      },
      bio: 'Digital archivist for Sicilian museums',
      description: 'Digital archivist for Sicilian museums',
    },
  ] satisfies RequiredDataFromCollectionSlug<'users'>[]
  for (const user of demoUsers) {
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
      depth: 0,
    })
    if (found.docs.length > 0) {
      console.log(`User "${user.email}" already exists, skipping`)
      continue
    }
    await payload.create({ collection: 'users', data: user })
    console.log(`User "${user.email}" created`)
  }

  console.log('Database seeded successfully. Closing connection...')
  await payload.destroy()
  console.log('Payload connection closed. Exiting process.')
  process.exit(0)
} catch (e) {
  console.error('Error seeding database:', e)
  process.exit(1)
}
