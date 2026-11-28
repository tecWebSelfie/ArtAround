import type { Access, CollectionBeforeChangeHook, SanitizedConfig, Where } from 'payload'
import { APIError } from 'payload'

import { anyMuseumStaff, isSuperAdmin } from '@/access/museumRoles'

/**
 * Payload appends its internal collections (`payload-preferences`,
 * `payload-locked-documents`) while sanitizing the config, after plugins, so
 * neither a plugin nor the config we pass to `buildConfig` can change their
 * access. We tighten them on the sanitized config instead: the runtime reads
 * `collection.config.access.*` for REST and GraphQL alike.
 *
 * `payload-preferences` only restricts read/delete to the owner; its `update`
 * defaulted to "any signed-in user", so `PATCH /api/payload-preferences/<id>`
 * edited (and stole) somebody else's row (N42). The owner's own writes go
 * through `POST /api/payload-preferences/:key`, which upserts with
 * `payload.db` and never consults collection access, so they keep working.
 */
const ownerOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  const byUser: Where = { 'user.value': { equals: user.id } }
  const byCollection: Where = { 'user.relationTo': { equals: user.collection } }
  return { and: [byUser, byCollection] }
}

/**
 * `payload-locked-documents` (N43): Payload's own lock/unlock writes never go
 * through collection access (`handleFormStateLocking` and the 423 check use
 * `payload.db`), so REST `create` can be closed entirely. The admin panel
 * does use REST as the signed-in user for the rest:
 * - read: `getIsLocked`/`handleFormStateLocking` read OTHER users' locks to
 *   show "locked by", so museum staff (the admin panel's users) keep read;
 *   everybody else sees only their own locks;
 * - update: "take over" PATCHes someone else's lock to the caller, so staff
 *   may update, but the hook below forces `user` to be the caller and the
 *   document to be one the caller may update;
 * - delete: unlocking on leave deletes the caller's own lock.
 * Without this any signed-in user could forge a lock on a foreign museum and
 * make its director's saves answer 423 forever.
 */
const ownLocks: Access = ({ req }) => (isSuperAdmin(req) ? true : ownerOnly({ req }))
const staffReadsAllLocks: Access = async (args) =>
  (await anyMuseumStaff(args)) ? true : ownerOnly(args)
const staffOnly: Access = (args) => anyMuseumStaff(args)

const lockMayOnlyBeTakenByEditor: CollectionBeforeChangeHook = async ({ data, req }) => {
  const { user, payload } = req
  if (!user || isSuperAdmin(req)) return data
  const holder = data.user as { relationTo?: string; value?: unknown } | undefined
  const holderId =
    typeof holder?.value === 'object' ? (holder.value as { id?: string })?.id : holder?.value
  if (holder?.relationTo !== user.collection || holderId !== user.id)
    throw new APIError('A lock can only be held by its own user.', 403)
  const target = data.document as { relationTo?: string; value?: string } | undefined
  const access = target?.relationTo
    ? (payload.collections as Record<string, { config: { access: { update?: Access } } }>)[
        target.relationTo
      ]?.config.access.update
    : undefined
  if (!access || !target?.relationTo) throw new APIError('Only editors may lock a document.', 403)
  const allowed = await access({ req, id: target.value })
  const permitted =
    allowed === true ||
    (typeof allowed === 'object' &&
      (
        await payload.count({
          collection: target.relationTo as 'museums',
          overrideAccess: true,
          where: { and: [{ id: { equals: target.value } }, allowed] },
        })
      ).totalDocs > 0)
  if (!permitted) throw new APIError('Only editors may lock a document.', 403)
  return data
}

// Per internal collection slug, the operations to restrict to the owner.
const OWNER_ONLY_OPERATIONS = {
  'payload-preferences': ['update'],
} as const

export async function hardenInternalCollections(
  sanitized: Promise<SanitizedConfig>,
): Promise<SanitizedConfig> {
  const config = await sanitized
  for (const [slug, operations] of Object.entries(OWNER_ONLY_OPERATIONS)) {
    const collection = config.collections.find((c) => c.slug === slug)
    if (!collection) continue
    for (const operation of operations) collection.access[operation] = ownerOnly
  }
  const locks = config.collections.find((c) => c.slug === 'payload-locked-documents')
  if (locks) {
    locks.access.create = () => false
    locks.access.read = staffReadsAllLocks
    locks.access.update = staffOnly
    locks.access.delete = ownLocks
    locks.hooks.beforeChange.push(lockMayOnlyBeTakenByEditor)
  }
  return config
}
