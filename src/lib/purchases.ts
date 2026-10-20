import type { Payload } from 'payload'
import type Stripe from 'stripe'

import { PURCHASES_COLLECTION_SLUG } from '@/collections/Purchases'
import { isPurchasable } from '@/lib/entitlements'

/**
 * Turn a *paid* Stripe Checkout Session into a `purchases` row.
 *
 * Idempotent by construction: `stripeSessionID` is unique, so re-delivered
 * webhooks and the success-page reconciliation can both call this and only the
 * first insert wins. The user + document are taken from session metadata, which
 * is set by `POST /api/checkout` — never from client input.
 */
export async function recordPurchaseFromSession(
  payload: Payload,
  session: Stripe.Checkout.Session,
): Promise<{ created: boolean }> {
  if (session.payment_status !== 'paid') return { created: false }

  const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined
  const collection = session.metadata?.collection
  const docId = session.metadata?.docId

  if (!userId || !isPurchasable(collection) || !docId) {
    payload.logger.error(
      `[stripe] checkout session ${session.id} is missing metadata (userId/collection/docId); no purchase recorded.`,
    )
    return { created: false }
  }

  const existing = await payload.find({
    collection: PURCHASES_COLLECTION_SLUG,
    where: { stripeSessionID: { equals: session.id } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) return { created: false }

  // Contents the checkout priced in (`quoteCheckout`); only well-formed ids are kept.
  const unlockedContents = (session.metadata?.unlocks ?? '')
    .split(',')
    .filter((value) => /^[a-f\d]{24}$/i.test(value))

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? undefined)

  try {
    await payload.create({
      collection: PURCHASES_COLLECTION_SLUG,
      overrideAccess: true,
      depth: 0,
      data: {
        user: userId,
        target: { relationTo: collection, value: docId },
        unlockedContents,
        status: 'paid',
        stripeSessionID: session.id,
        stripePaymentIntentID: paymentIntentId,
        productTitle: session.metadata?.title ?? undefined,
        amountCents: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        email: session.customer_details?.email ?? undefined,
        purchasedAt: new Date().toISOString(),
      },
    })
    payload.logger.info(
      `[stripe] purchase recorded — user=${userId} ${collection}:${docId} session=${session.id}`,
    )
    return { created: true }
  } catch (error) {
    // Lost the race against a concurrent delivery (unique index on stripeSessionID).
    payload.logger.warn(
      `[stripe] purchase insert skipped for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`,
    )
    return { created: false }
  }
}

/**
 * Safety net for when the webhook never arrives (e.g. local dev without
 * `stripe listen`, or a dropped delivery). Called from the success page:
 * re-reads the session from Stripe, verifies it belongs to `userId`, then
 * records the purchase idempotently.
 */
export async function reconcileCheckoutSession({
  payload,
  stripe,
  sessionId,
  userId,
}: {
  payload: Payload
  stripe: Stripe
  sessionId: string
  userId: string | number
}): Promise<{ created: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const owner = session.metadata?.userId ?? session.client_reference_id
  if (owner && String(owner) !== String(userId)) {
    payload.logger.warn(
      `[stripe] session ${sessionId} does not belong to user ${userId}; skipping reconciliation.`,
    )
    return { created: false }
  }
  return recordPurchaseFromSession(payload, session)
}
