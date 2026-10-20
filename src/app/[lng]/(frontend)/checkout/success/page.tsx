import config from '@payload-config'
import type { Route } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { getT } from '@/i18n.server'
import { hasPurchased } from '@/lib/entitlements'
import { reconcileCheckoutSession } from '@/lib/purchases'
import { getStripe } from '@/lib/stripe'
import { CheckoutOutcome } from '../CheckoutOutcome'
import { checkoutReturn } from '../return-path'

export const dynamic = 'force-dynamic'

/**
 * Landing page after a successful Stripe Checkout redirect.
 *
 * It is also the webhook safety net: if `checkout.session.completed` hasn't
 * arrived (local dev without `stripe listen`, dropped delivery), the session is
 * re-read from Stripe and the purchase recorded here, idempotently.
 *
 * What the page *says* never comes from that attempt: it asks the purchases
 * collection whether the bought item is now owned. So it can't claim
 * "unlocked" for a signed-out visitor, a URL without a session, an unpaid or
 * foreign session, or a Stripe outage.
 */
export default async function CheckoutSuccess(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<{
    session_id?: string | string[]
    collection?: string | string[]
    id?: string | string[]
  }>
}) {
  const { lng } = await props.params
  const search = await props.searchParams
  const sessionId = typeof search.session_id === 'string' ? search.session_id : undefined
  const back = checkoutReturn(lng, search)
  const { t } = await getT('checkout')

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const reference = sessionId ? t('Payment reference {{id}}', { id: sessionId }) : undefined

  if (!user || user.collection !== 'users') {
    const here = `/${lng}/checkout/success?${new URLSearchParams(
      Object.entries(search).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : [],
      ),
    )}`
    return (
      <CheckoutOutcome
        title={t('Sign in to see your purchase')}
        description={t(
          'Purchases are saved to the account that paid. Sign in with it to find yours unlocked.',
        )}
        detail={reference}
        action={{
          label: t('Sign in'),
          href: `/${lng}/login?next=${encodeURIComponent(here)}` as Route,
        }}
      />
    )
  }

  if (sessionId) {
    try {
      await reconcileCheckoutSession({ payload, stripe: getStripe(), sessionId, userId: user.id })
    } catch (error) {
      // The webhook may still deliver; the ownership check below tells the truth either way.
      payload.logger.error(
        `[stripe] reconcile failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const owned = back.target
    ? await hasPurchased(payload, user.id, back.target.collection, back.target.id)
    : false
  const action = {
    label: back.isTour
      ? t('Back to the tour')
      : back.target?.collection === 'contents'
        ? t('Back to the content')
        : t('Back to the navigator'),
    href: back.href,
  }

  return owned ? (
    <CheckoutOutcome
      title={t('Payment received')}
      description={
        back.isTour
          ? t('The paid contents of this tour are now unlocked on your account.')
          : t('Your purchase is now unlocked on your account.')
      }
      detail={reference}
      action={action}
    />
  ) : (
    <CheckoutOutcome
      title={t('Payment not confirmed yet')}
      description={t(
        'Stripe has not confirmed this payment to us yet. It unlocks on your account as soon as it does; there is nothing else to do.',
      )}
      detail={reference}
      action={action}
    />
  )
}
