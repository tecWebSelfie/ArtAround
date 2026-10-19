import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { hasPurchased, isPurchasable } from '@/lib/entitlements'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/** Shape we need from a sellable document — `Content` and `Tour` both fit. */
type PurchasableDoc = {
  id: string | number
  title?: string | null
  pricing?: {
    priceCents?: number | null
    currency?: string | null
    stripePriceID?: string | null
  } | null
}

/**
 * `POST /api/checkout` — start a sandbox Stripe Checkout Session for one
 * sellable document.
 *
 * Body: `{ collection: 'contents' | 'tours', id: string, locale?: string }`
 * Returns: `{ url }` to redirect the browser to.
 *
 * Trust boundary: the buyer's identity comes from the Payload session (cookie),
 * never from the body. The document's price is read from the database, so a
 * client can't tamper with what it pays.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.collection !== 'users') {
    return NextResponse.json(
      { error: 'Sign in to buy this.', code: 'unauthenticated' },
      { status: 401 },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    collection?: unknown
    id?: unknown
    locale?: unknown
  } | null

  const collection = body?.collection
  const id =
    typeof body?.id === 'string' || typeof body?.id === 'number' ? String(body.id) : undefined
  const locale = typeof body?.locale === 'string' && body.locale ? body.locale : 'en'

  if (!isPurchasable(collection) || !id) {
    return NextResponse.json(
      { error: 'Invalid collection or id.', code: 'bad-request' },
      { status: 400 },
    )
  }

  const doc = (await payload.findByID({
    collection,
    id,
    depth: 0,
    overrideAccess: true,
  })) as unknown as PurchasableDoc

  const priceCents = doc?.pricing?.priceCents ?? 0
  const currency = doc?.pricing?.currency ?? 'eur'
  if (!priceCents) {
    return NextResponse.json(
      { error: 'This item is free or not for sale.', code: 'not-for-sale' },
      { status: 400 },
    )
  }

  if (await hasPurchased(payload, user.id, collection, id)) {
    return NextResponse.json({ error: 'You already own this.', code: 'owned' }, { status: 409 })
  }

  const stripe = getStripe()
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const title = doc.title || `${collection} ${id}`
  const stripePriceID = doc.pricing?.stripePriceID || undefined

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: String(user.id),
    customer_email: user.email ?? undefined,
    metadata: { userId: String(user.id), collection, docId: id, title },
    line_items: [
      stripePriceID
        ? { quantity: 1, price: stripePriceID }
        : {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: priceCents,
              product_data: { name: title, metadata: { collection, docId: id } },
            },
          },
    ],
    success_url: `${origin}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}/checkout/cancel?collection=${collection}&id=${id}`,
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
