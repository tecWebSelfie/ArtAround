import { entitlementKey, getEntitlements } from '@/lib/entitlements'
import type { PayloadRequest } from 'payload'

/**
 * Purchase seam used by access control: everything that needs to know "has
 * this user bought content X?" goes through these two functions.
 *
 * Backed by the Stripe `purchases` collection (`src/lib/entitlements.ts`): a
 * content is owned when it was bought directly or unlocked by a tour purchase
 * (`purchases.unlockedContents`). Lookups are memoized on `req.context`, so a
 * page that reads many paid bodies queries purchases once.
 */
export async function getOwnedContentIds(req: PayloadRequest): Promise<Set<string>> {
  if (!req.user) return new Set()
  const prefix = entitlementKey('contents', '')
  const owned = new Set<string>()
  for (const key of await getEntitlements(req)) {
    if (key.startsWith(prefix)) owned.add(key.slice(prefix.length))
  }
  return owned
}

export async function ownsContent(req: PayloadRequest, contentId: string): Promise<boolean> {
  return (await getEntitlements(req)).has(entitlementKey('contents', contentId))
}
