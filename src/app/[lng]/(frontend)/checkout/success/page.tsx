import config from '@payload-config'
import { Button, Card, Stack, Text, Title } from '@mantine/core'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { reconcileCheckoutSession } from '@/lib/purchases'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * Landing page after a successful Stripe Checkout redirect.
 *
 * This is also the webhook safety net: if the `checkout.session.completed`
 * webhook hasn't arrived (local dev without `stripe listen`, dropped delivery),
 * we re-read the session from Stripe here and record the purchase ourselves.
 * Idempotent, so double-recording is impossible.
 */
export default async function CheckoutSuccess(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<{ session_id?: string | string[] }>
}) {
  const { lng } = await props.params
  const search = await props.searchParams
  const sessionId = typeof search.session_id === 'string' ? search.session_id : undefined

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  let recorded = false
  let reconcileFailed = false

  if (user && sessionId) {
    try {
      const result = await reconcileCheckoutSession({
        payload,
        stripe: getStripe(),
        sessionId,
        userId: user.id,
      })
      recorded = result.created
    } catch (error) {
      reconcileFailed = true
      payload.logger.error(
        `[stripe] reconcile failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return (
    <Stack p="lg" maw={520} mx="auto">
      <Card withBorder p="lg">
        <Title order={2}>Payment received 🎉</Title>
        <Text mt="sm" c="dimmed">
          Thank you! Your purchase is confirmed and unlocked on your account.
        </Text>
        {sessionId ? (
          <Text mt="xs" size="xs" c="dimmed">
            Reference: {sessionId}
          </Text>
        ) : null}
        <Text mt="md" size="sm" c="dimmed">
          {recorded
            ? 'Saved to your library.'
            : reconcileFailed
              ? 'We could not verify the session just now — access appears as soon as Stripe confirms.'
              : 'Already in your library.'}
        </Text>
      </Card>
      <Button component="a" href={`/${lng}/stripe-test`}>
        Back to my purchases
      </Button>
    </Stack>
  )
}
