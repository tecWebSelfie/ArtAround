import 'server-only'

import type { Payload } from 'payload'

import type { PurchasableCollection } from '@/lib/entitlements'
import { filterPopulated } from '@/lib/isPopulated'
import { isLocked, PRICE_CURRENCY } from '@/lib/price'
import type { User } from '@/payload-types'

/**
 * What a visitor would pay for a content or a tour right now, and which
 * contents that payment unlocks. Shared by `POST /api/checkout` (the amount
 * Stripe charges) and the sandbox shop, so the two never disagree.
 *
 * Prices follow the paid-content model (docs/permissions-and-editing.md):
 * - a content costs its `price` (euro cents) while it is locked for the viewer;
 * - a tour costs the sum of its contents that are locked for the viewer, and
 *   buying it unlocks exactly those contents (`purchases.unlockedContents`).
 *
 * "Locked" is read the same way the pages read it: the document is fetched as
 * the visitor, so field access (`canReadPaidBody`) has already accounted for
 * authorship, museum staff and earlier purchases.
 */
export type CheckoutQuote = {
  title: string
  amountCents: number
  currency: typeof PRICE_CURRENCY
  /** Content ids this purchase unlocks; empty means there is nothing to buy. */
  unlocks: string[]
}

export async function quoteCheckout(
  payload: Payload,
  user: User,
  collection: PurchasableCollection,
  id: string,
): Promise<CheckoutQuote> {
  const asViewer = { user, overrideAccess: false as const }
  if (collection === 'contents') {
    const content = await payload.findByID({ collection, id, depth: 0, ...asViewer })
    const locked = isLocked(content)
    return {
      title: content.title,
      amountCents: locked ? (content.price ?? 0) : 0,
      currency: PRICE_CURRENCY,
      unlocks: locked ? [String(content.id)] : [],
    }
  }
  const tour = await payload.findByID({ collection, id, depth: 1, ...asViewer })
  const locked = filterPopulated(tour.contents).filter(isLocked)
  return {
    title: tour.title,
    amountCents: locked.reduce((sum, content) => sum + (content.price ?? 0), 0),
    currency: PRICE_CURRENCY,
    unlocks: locked.map((content) => String(content.id)),
  }
}
