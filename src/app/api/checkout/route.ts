import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload, NotFound } from 'payload'

import { quoteCheckout } from '@/lib/checkout-quote'
import { isPurchasable } from '@/lib/entitlements'
import { getStripe } from '@/lib/stripe'
import type { User } from '@/payload-types'

export const dynamic = 'force-dynamic'

/**
 * Stripe metadata values are capped at 500 characters; 24-char Mongo ids plus
 * separators leave room for 20 unlocked contents per purchase.
 */
const MAX_UNLOCKS = 20

/**
 * `POST /api/checkout` — start a sandbox Stripe Checkout Session for one
 * content, or for every locked content of a tour.
 *
 * Body: `{ collection: 'contents' | 'tours', id: string, locale?: string }`
 * Returns: `{ url }` to redirect the browser to.
 *
 * Trust boundary: the buyer's identity comes from the Payload session (cookie),
 * never from the body. The amount and the unlocked contents are computed
 * server-side for that buyer (`quoteCheckout`), so a client can't tamper with
 * what it pays or what it gets.
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
  // Only used to build our own redirect paths: keep it to a plain language tag.
  const locale =
    typeof body?.locale === 'string' && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(body.locale)
      ? body.locale
      : 'en'

  if (!isPurchasable(collection) || !id) {
    return NextResponse.json(
      { error: 'Invalid collection or id.', code: 'bad-request' },
      { status: 400 },
    )
  }

  let quote
  try {
    quote = await quoteCheckout(payload, user as User, collection, id)
  } catch (error) {
    if (error instanceof NotFound) {
      return NextResponse.json({ error: 'Not found.', code: 'not-found' }, { status: 404 })
    }
    throw error
  }

  if (!quote.unlocks.length || !quote.amountCents) {
    // Free, already owned, or authored/staff-readable: nothing left to unlock.
    return NextResponse.json(
      { error: 'You can already read all of this.', code: 'owned' },
      { status: 409 },
    )
  }
  if (quote.unlocks.length > MAX_UNLOCKS) {
    return NextResponse.json(
      { error: 'Too many paid contents to buy at once.', code: 'too-many' },
      { status: 400 },
    )
  }

  const stripe = getStripe()
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const title = quote.title || `${collection} ${id}`
  const back = `collection=${collection}&id=${encodeURIComponent(id)}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: String(user.id),
    customer_email: user.email ?? undefined,
    metadata: {
      userId: String(user.id),
      collection,
      docId: id,
      title,
      // Read back by `recordPurchaseFromSession` into `purchases.unlockedContents`.
      unlocks: quote.unlocks.join(','),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: quote.currency.toLowerCase(),
          unit_amount: quote.amountCents,
          product_data: { name: title, metadata: { collection, docId: id } },
        },
      },
    ],
    success_url: `${origin}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}&${back}`,
    cancel_url: `${origin}/${locale}/checkout/cancel?${back}`,
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
