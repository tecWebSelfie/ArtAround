import config from '@payload-config'
import { Alert, Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { BuyButton } from '@/components/payments/BuyButton'
import { quoteCheckout } from '@/lib/checkout-quote'
import { formatPrice } from '@/lib/price'
import type { User } from '@/payload-types'
import { isStripeTestMode } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type ShopItem = {
  collection: 'contents' | 'tours'
  id: string
  title: string
  /** Price with nothing owned yet. */
  listPriceCents: number
  /** What this visitor would pay now (`quoteCheckout`); 0 = already readable. */
  priceCents: number
}

/**
 * Demo shop for the sandbox purchase flow. Lists every paid content and every
 * tour containing one, with what the signed-in user would pay now (contents
 * they own, wrote or staff are free), and starts Stripe Checkout through
 * `/api/checkout`.
 *
 * Sibling to `typesense-test` / `test-translation` — a throwaway harness page,
 * not part of the product UI.
 */
export default async function StripeTestPage(props: { params: Promise<{ lng: string }> }) {
  const { lng } = await props.params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  // Paid contents, and the tours that contain at least one of them.
  const contents = await payload.find({
    collection: 'contents',
    where: { price: { greater_than: 0 } },
    limit: 50,
    depth: 0,
    select: { title: true, price: true },
    overrideAccess: true,
  })
  const tours = await payload.find({
    collection: 'tours',
    where: { contents: { in: contents.docs.map((doc) => doc.id) } },
    limit: 50,
    depth: 0,
    select: { title: true },
    overrideAccess: true,
  })

  // Signed in: the same quote checkout will charge (0 = nothing left to buy).
  // Anonymous: the list price, i.e. every paid content still locked.
  const quote = async (collection: 'contents' | 'tours', id: string, listPrice: number) =>
    user ? (await quoteCheckout(payload, user as User, collection, id)).amountCents : listPrice
  const paidContents = new Map(contents.docs.map((doc) => [String(doc.id), doc.price ?? 0]))

  const items: ShopItem[] = await Promise.all([
    ...contents.docs.map(async (doc) => ({
      collection: 'contents' as const,
      id: String(doc.id),
      title: doc.title,
      listPriceCents: doc.price ?? 0,
      priceCents: await quote('contents', String(doc.id), doc.price ?? 0),
    })),
    ...tours.docs.map(async (doc) => {
      const full = await payload.findByID({
        collection: 'tours',
        id: doc.id,
        depth: 0,
        select: { contents: true },
        overrideAccess: true,
      })
      const listPrice = (full.contents ?? [])
        .map((content) => paidContents.get(typeof content === 'string' ? content : content.id) ?? 0)
        .reduce((sum, cents) => sum + cents, 0)
      return {
        collection: 'tours' as const,
        id: String(doc.id),
        title: doc.title,
        listPriceCents: listPrice,
        priceCents: await quote('tours', String(doc.id), listPrice),
      }
    }),
  ])

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
          Add a price (in euro cents) to a <code>contents</code> document in the admin panel; it and
          the tours containing it will show up here.
        </Alert>
      ) : (
        <Stack>
          {items.map((item) => {
            const owned = Boolean(user) && item.priceCents === 0
            return (
              <Card key={`${item.collection}:${item.id}`} withBorder p="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Stack gap={2}>
                    <Text fw={600}>{item.title || `${item.collection} ${item.id}`}</Text>
                    <Group gap="xs">
                      <Badge variant="outline">{item.collection}</Badge>
                      <Text size="sm" c="dimmed">
                        {formatPrice(owned ? item.listPriceCents : item.priceCents, lng)}
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
