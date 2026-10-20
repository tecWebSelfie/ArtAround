/**
 * Where the checkout landing pages send the buyer back to. `POST /api/checkout`
 * appends `collection` and `id` to Stripe's success/cancel URLs: a tour returns
 * to its page (now unlocked, or still locked after a cancel); anything else
 * goes back to the navigator, since contents open inside tours and museums.
 */
export function checkoutReturnPath(
  lng: string,
  search: { collection?: string | string[]; id?: string | string[] },
): string {
  const id = typeof search.id === 'string' ? search.id : undefined
  if (search.collection === 'tours' && id && /^[a-f\d]{24}$/i.test(id)) {
    return `/${lng}/tour/${id}`
  }
  return `/${lng}/navigator`
}
