import config from '@payload-config'
import { Alert, Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { BuyButton } from '@/components/payments/BuyButton'
import { entitlementKey, loadEntitlements } from '@/lib/entitlements'
import { isStripeTestMode } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type ShopItem = {
  collection: 'contents' | 'tours'
  id: string
  title: string
  priceCents: number
  currency: string
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/**
 * Demo shop for the sandbox purchase flow. Lists every `contents`/`tours`
 * document with a price, shows what the signed-in user already owns, and starts
 * Stripe Checkout through `/api/checkout`.
 *
 * Sibling to `typesense-test` / `test-translation` — a throwaway harness page,
 * not part of the product UI.
 */
export default async function StripeTestPage(props: { params: Promise<{ lng: string }> }) {
  const { lng } = await props.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  const [contents, tours] = await Promise.all([
    payload.find({
      collection: 'contents',
      where: { 'pricing.priceCents': { greater_than: 0 } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'tours',
      where: { 'pricing.priceCents': { greater_than: 0 } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const entitlements = user ? await loadEntitlements(payload, user.id) : new Set<string>()

  const items: ShopItem[] = [
    ...contents.docs.map((doc) => ({
      collection: 'contents' as const,
      id: String(doc.id),
      title: doc.title,
      priceCents: doc.pricing?.priceCents ?? 0,
      currency: doc.pricing?.currency ?? 'eur',
    })),
    ...tours.docs.map((doc) => ({
      collection: 'tours' as const,
      id: String(doc.id),
      title: doc.title,
      priceCents: doc.pricing?.priceCents ?? 0,
      currency: doc.pricing?.currency ?? 'eur',
    })),
  ]

  return (
    <Stack p="lg" maw={720} mx="auto">
      <Group justify="space-between" align="center">
        <Title order={1}>Stripe sandbox shop</Title>
        <Badge color={isStripeTestMode() ? 'green' : 'red'} variant="light">
          {isStripeTestMode() ? 'Sandbox (test key)' : 'LIVE KEY — check .env'}
        </Badge>
      </Group>

      <Text c="dimmed" size="sm">
        Pay with the test card <code>4242 4242 4242 4242</code>, any future expiry and any CVC.
      </Text>

      {!user ? (
        <Alert color="blue" title="Sign in to test purchases">
          You are browsing anonymously. Purchases require a signed-in user so they can be attached
          to an account.
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Alert color="yellow" title="Nothing for sale yet">
          Add a price (in cents) to a <code>contents</code> or <code>tours</code> document in the
          admin panel and it will show up here.
        </Alert>
      ) : (
        <Stack>
          {items.map((item) => {
            const owned = entitlements.has(entitlementKey(item.collection, item.id))
            return (
              <Card key={`${item.collection}:${item.id}`} withBorder p="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={600}>{item.title || `${item.collection} ${item.id}`}</Text>
                    <Group gap="xs">
                      <Badge variant="outline">{item.collection}</Badge>
                      <Text size="sm" c="dimmed">
                        {formatPrice(item.priceCents, item.currency)}
                      </Text>
                    </Group>
                  </Stack>
                  {owned ? (
                    <Badge color="green">Owned</Badge>
                  ) : (
                    <BuyButton
                      collection={item.collection}
                      id={item.id}
                      locale={lng}
                      label="Buy"
                      disabled={!user}
                    />
                  )}
                </Group>
              </Card>
            )
          })}
        </Stack>
      )}

      <Text size="xs" c="dimmed">
        Webhook endpoint: <code>POST /api/stripe/webhooks</code>. Locally, run{' '}
        <code>stripe listen --forward-to localhost:3000/api/stripe/webhooks</code> and put the
        printed <code>whsec_…</code> in <code>STRIPE_WEBHOOKS_ENDPOINT_SECRET</code>.
      </Text>
    </Stack>
  )
}
