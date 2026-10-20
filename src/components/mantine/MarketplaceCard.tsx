import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import type { Difficulty } from '@/payload-types'
import { Badge, Box, Card, CardSection, Group, Image, Stack, Text, Title } from '@mantine/core'
import { ArrowUpRight, AtSign, BookOpen, Clock, Map, UserRound } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

/** Branded fallback: a kind-coloured gradient instead of a grey placeholder
 *  image, so documents without artwork still look intentional in the grid. */
const FALLBACK_BACKGROUND = {
  tour: 'linear-gradient(135deg, var(--mantine-color-grape-6), var(--mantine-color-orange-4))',
  content: 'linear-gradient(135deg, var(--mantine-color-teal-6), var(--mantine-color-cyan-4))',
  user: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-4))',
} as const

type MarketplaceBaseItem = {
  key: string
  id: string
  title: string
  description?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  createdAt: string
}

/**
 * Marketplace results are intentionally a discriminated union: users have no
 * price, while tours and contents always do. The card can then render the right
 * footer and metadata without runtime `undefined` checks.
 */
export type MarketplaceItem =
  | (MarketplaceBaseItem & {
      kind: 'tour'
      priceCents: number
      currency: string
      durationMinutes?: number | null
    })
  | (MarketplaceBaseItem & {
      kind: 'content'
      priceCents: number
      currency: string
      difficulty?: Difficulty
      readingTimeMins?: number | null
    })
  | (MarketplaceBaseItem & {
      kind: 'user'
      username: string
    })

export type MarketplaceCardLabels = {
  free: string
  tour: string
  content: string
  user: string
  viewProfile: string
  min: string
  minRead: string
}

function formatPrice(cents: number, currency: string, locale: string) {
  const amount = cents / 100
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    // Drop the ".00" on whole prices — "€11" reads better in a dense grid.
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * One marketplace result. The whole card is the link (no nested interactive
 * elements), and the footer always shows either the price, a "Free" badge, or
 * the profile action so every result type is distinguishable at a glance.
 */
export function MarketplaceCard({
  item,
  locale,
  labels,
}: {
  item: MarketplaceItem
  locale: string
  labels: MarketplaceCardLabels
}) {
  const isTour = item.kind === 'tour'
  const isContent = item.kind === 'content'
  const isUser = item.kind === 'user'
  const isPaid = !isUser && item.priceCents > 0

  const href = (
    isTour
      ? `/${locale}/tour/${item.id}`
      : isContent
        ? `/${locale}/content/${item.id}`
        : `/${locale}/user/${item.id}`
  ) as Route

  const kindLabel = isTour ? labels.tour : isContent ? labels.content : labels.user
  const kindColor = isTour ? 'grape' : isContent ? 'teal' : 'blue'

  // `Link` wraps the card instead of being passed as Mantine's `component`:
  // a server component cannot hand the Link function to a client component.
  return (
    <Link
      href={href}
      style={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}
    >
      <Card
        withBorder
        shadow="sm"
        radius="lg"
        padding="sm"
        className="transition-transform duration-200 hover:-translate-y-1"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <CardSection>
          <Box style={{ position: 'relative' }}>
            {item.imageUrl ? (
              <Image h={168} fit="cover" src={item.imageUrl} alt={item.imageAlt || item.title} />
            ) : (
              <Box
                h={168}
                style={{
                  background: FALLBACK_BACKGROUND[item.kind],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isTour ? (
                  <Map size={40} color="white" opacity={0.9} aria-hidden />
                ) : isContent ? (
                  <BookOpen size={40} color="white" opacity={0.9} aria-hidden />
                ) : (
                  <UserRound size={40} color="white" opacity={0.9} aria-hidden />
                )}
              </Box>
            )}
            <Badge
              color={kindColor}
              variant="filled"
              autoContrast
              style={{ position: 'absolute', top: 8, left: 8 }}
            >
              {kindLabel}
            </Badge>
          </Box>
        </CardSection>

        <Stack gap="xs" mt="sm" style={{ flexGrow: 1 }}>
          <Title order={3} size="h5" lineClamp={2}>
            {item.title}
          </Title>
          {item.description ? (
            <Text size="sm" c="dimmed" lineClamp={2}>
              {item.description}
            </Text>
          ) : null}

          <Group gap="xs" mt="auto">
            {isTour && item.durationMinutes ? (
              <Group gap={4}>
                <Clock size={14} aria-hidden />
                <Text size="xs" c="dimmed">
                  {item.durationMinutes} {labels.min}
                </Text>
              </Group>
            ) : null}
            {isContent && item.difficulty ? (
              <DifficultyBadge difficulty={item.difficulty} size="xs" />
            ) : null}
            {isContent && item.readingTimeMins ? (
              <Group gap={4}>
                <Clock size={14} aria-hidden />
                <Text size="xs" c="dimmed">
                  {item.readingTimeMins} {labels.minRead}
                </Text>
              </Group>
            ) : null}
            {isUser ? (
              <Group gap={4}>
                <AtSign size={14} aria-hidden />
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.username}
                </Text>
              </Group>
            ) : null}
          </Group>
        </Stack>

        <CardSection inheritPadding withBorder py="xs" mt="sm">
          <Group justify="space-between" wrap="nowrap">
            {isUser ? (
              <Text fw={700} c="blue.8">
                {labels.viewProfile}
              </Text>
            ) : (
              <Text fw={700} c={isPaid ? undefined : 'green.8'}>
                {isPaid ? formatPrice(item.priceCents, item.currency, locale) : labels.free}
              </Text>
            )}
            <ArrowUpRight size={16} aria-hidden />
          </Group>
        </CardSection>
      </Card>
    </Link>
  )
}
