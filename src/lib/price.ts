import type { Content } from '@/payload-types'

/**
 * Prices are stored as integer euro cents (`contents.price`). Formatting
 * follows the visitor's language through `Intl.NumberFormat`, which localizes
 * separators and symbol placement ("€ 4,50" / "€4.50") but not the currency
 * itself: choosing and converting to a local currency needs the visitor's
 * region and exchange rates, which belong to the payments workstream.
 */
export const PRICE_CURRENCY = 'EUR'

export function formatPrice(cents: number, lng: string) {
  return new Intl.NumberFormat(lng, { style: 'currency', currency: PRICE_CURRENCY }).format(
    cents / 100,
  )
}

export const isPaid = (content: Pick<Content, 'price'>) => (content.price ?? 0) > 0

/**
 * A paid content is locked for the visitor when the server withheld its body:
 * field-level access already accounts for authorship, museum staff and
 * purchases, so the page never re-implements those rules.
 */
export const isLocked = (content: Pick<Content, 'price' | 'body'>) =>
  isPaid(content) && content.body == null

/** A tour costs the sum of the contents the visitor cannot read yet. */
export function lockedTotal(contents: Pick<Content, 'price' | 'body'>[]) {
  return contents.filter(isLocked).reduce((sum, content) => sum + (content.price ?? 0), 0)
}
