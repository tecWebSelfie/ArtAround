import type { StripeWebhookHandler } from '@payloadcms/plugin-stripe/types'
import type Stripe from 'stripe'

import { recordPurchaseFromSession } from '@/lib/purchases'

/**
 * `checkout.session.completed` → write the `purchases` receipt.
 *
 * Registered through `stripePlugin({ webhooks: { 'checkout.session.completed': … } })`
 * in `src/payload.config.ts`. The plugin already verified the Stripe signature
 * (`STRIPE_WEBHOOKS_ENDPOINT_SECRET`), so we only translate the event into a
 * durable entitlement. Idempotent — safe against Stripe's at-least-once retries.
 */
export const onCheckoutCompleted: StripeWebhookHandler<Stripe.Event> = async ({
  event,
  payload,
}) => {
  const session = event.data.object as Stripe.Checkout.Session
  await recordPurchaseFromSession(payload, session)
}
