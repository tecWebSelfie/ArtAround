import type { Route } from 'next'

/**
 * Where the checkout landing pages send the buyer back to. `POST /api/checkout`
 * appends `collection` and `id` to Stripe's success/cancel URLs: a tour returns
 * to its page (now unlocked, or still locked after a cancel), a content to its
 * page; anything else goes back to the navigator.
 */
export function checkoutReturn(
  lng: string,
  search: { collection?: string | string[]; id?: string | string[] },
): { href: Route; isTour: boolean; target?: { collection: 'contents' | 'tours'; id: string } } {
  const id =
    typeof search.id === 'string' && /^[a-f\d]{24}$/i.test(search.id) ? search.id : undefined
  const collection: 'contents' | 'tours' | undefined =
    search.collection === 'tours' || search.collection === 'contents'
      ? search.collection
      : undefined
  const target = id && collection ? { collection, id } : undefined
  if (target?.collection === 'tours') {
    return { href: `/${lng}/tour/${target.id}` as Route, isTour: true, target }
  }
  if (target?.collection === 'contents') {
    // Back on the content page: once unlocked it offers "Find it on the map".
    return { href: `/${lng}/content/${target.id}` as Route, isTour: false, target }
  }
  return { href: `/${lng}/navigator` as Route, isTour: false, target }
}
