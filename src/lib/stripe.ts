import Stripe from 'stripe'

/**
 * Server-only Stripe client.
 *
 * Sandbox-only by design: `STRIPE_SECRET_KEY` must be a test key (`sk_test_…`).
 * Never import this module from client code — it reads the secret key.
 * `isStripeTestMode()` is a cheap guard for logs/UI (the plugin gets the same
 * signal through `isTestKey` in `src/payload.config.ts`).
 */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_')
}

let cached: Stripe | null = null

export function getStripe(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set — add it to `.env` (sandbox key: `sk_test_…`).')
  }
  cached ??= new Stripe(stripeSecretKey, {
    // Pinned to the version the Payload Stripe plugin also uses (stripe@10.x).
    apiVersion: '2022-08-01',
    appInfo: { name: 'ArtAround', url: 'https://artaround.app' },
  })
  return cached
}
