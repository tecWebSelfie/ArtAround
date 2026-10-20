import type { Payload, PayloadRequest, Where } from 'payload'

import { PURCHASABLE_COLLECTIONS, PURCHASES_COLLECTION_SLUG } from '@/collections/Purchases'

export { PURCHASABLE_COLLECTIONS }
export type PurchasableCollection = (typeof PURCHASABLE_COLLECTIONS)[number]

/** Request-scoped cache key; avoids N+1 purchase lookups when reading lists. */
const CONTEXT_KEY = 'artaround:entitlements'

/** Canonical key for a purchased document: `contents:64f…`. */
export function entitlementKey(collection: string, id: string | number): string {
  return `${collection}:${String(id)}`
}

export function isPurchasable(value: unknown): value is PurchasableCollection {
  return typeof value === 'string' && (PURCHASABLE_COLLECTIONS as readonly string[]).includes(value)
}

/**
 * The one authoritative check: did this user pay for this document?
 * Reads the `purchases` collection via the Local API (trusted server code).
 */
export async function hasPurchased(
  payload: Payload,
  userId: string | number,
  collection: PurchasableCollection,
  id: string | number,
): Promise<boolean> {
  const where: Where = {
    and: [
      { user: { equals: userId } },
      { status: { equals: 'paid' } },
      // Polymorphic relationship: `.value` is the document id, `.relationTo` the
      // collection slug. See Payload docs "Has One - Polymorphic".
      {
        or: [
          {
            and: [
              { 'target.relationTo': { equals: collection } },
              { 'target.value': { equals: String(id) } },
            ],
          },
          // A tour purchase also owns the contents it unlocked.
          ...(collection === 'contents' ? [{ unlockedContents: { contains: String(id) } }] : []),
        ],
      },
    ],
  }

  const { totalDocs } = await payload.find({
    collection: PURCHASES_COLLECTION_SLUG,
    where,
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  return totalDocs > 0
}

/** Every `collection:id` this user owns, in a single query. */
export async function loadEntitlements(
  payload: Payload,
  userId: string | number,
): Promise<Set<string>> {
  const { docs } = await payload.find({
    collection: PURCHASES_COLLECTION_SLUG,
    where: {
      and: [{ user: { equals: userId } }, { status: { equals: 'paid' } }],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const keys = new Set<string>()
  for (const doc of docs) {
    const target = doc.target
    if (target && typeof target === 'object' && 'relationTo' in target && 'value' in target) {
      keys.add(entitlementKey(target.relationTo, target.value as string))
    }
    for (const content of doc.unlockedContents ?? []) {
      keys.add(entitlementKey('contents', typeof content === 'object' ? content.id : content))
    }
  }
  return keys
}

/**
 * Same as `loadEntitlements`, but memoized on `req.context` so a page that
 * reads many documents only hits the database once.
 */
export async function getEntitlements(req: PayloadRequest): Promise<Set<string>> {
  const user = req.user
  if (!user) return new Set()

  const context = req.context as Record<string, unknown>
  const cached = context[CONTEXT_KEY]
  if (cached instanceof Set) return cached as Set<string>

  const entitlements = await loadEntitlements(req.payload, user.id)
  context[CONTEXT_KEY] = entitlements
  return entitlements
}

/** Convenience wrapper for use inside field hooks / page loads. */
export async function isPurchased(
  req: PayloadRequest,
  collection: string,
  id: string | number,
): Promise<boolean> {
  if (!isPurchasable(collection)) return false
  const entitlements = await getEntitlements(req)
  return entitlements.has(entitlementKey(collection, id))
}
