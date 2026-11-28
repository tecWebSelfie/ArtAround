import type { Access, SanitizedConfig, Where } from 'payload'

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

// Per internal collection slug, the operations to restrict to the owner.
// Add `payload-locked-documents` here if it ever needs hardening.
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
  return config
}
