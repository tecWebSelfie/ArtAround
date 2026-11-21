import { DifficultyBadge } from '@/components/mantine/DifficultyBadge'
import type { Difficulty } from '@/payload-types'
import { Badge, Box, Card, CardSection, Group, Image, Stack, Text, Title } from '@mantine/core'
import { ArrowUpRight, AtSign, Clock, Landmark, UserRound } from 'lucide-react'
import { KIND_FALLBACK } from './kind-fallback'
import type { Route } from 'next'
import Link from 'next/link'
import { formatDuration } from '@/lib/duration'

type MarketplaceBaseItem = {
  key: string
  id: string
  title: string
  description?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  createdAt: string
  /** Where it runs / is on show, when the source document has it populated. */
  museumName?: string | null
  /** Who made it, when the source document has it populated. */
  authorName?: string | null
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
      durationSeconds?: number | null
    })
  | (MarketplaceBaseItem & {
      kind: 'user'
      username: string
    })
  | (MarketplaceBaseItem & {
      kind: 'object'
      /** Artist, when known: shown under the title. */
      artist?: string | null
    })

export type MarketplaceCardLabels = {
  free: string
  tour: string
  content: string
  user: string
  object: string
  viewProfile: string
  viewObject: string
  min: string
  /** Translated difficulty names (the badge's own labels are English keys). */
  difficulty: Record<Difficulty, string>
  /**
   * The byline and the accessible name are translated by the page (it owns
   * `t`), which also interpolates the names: the card itself has no i18n hook.
   * These stay functions so a value never has to be re-assembled here.
   */
  atMuseum: (name: string) => string
  byAuthor: (name: string) => string
  /** The card link's accessible name: kind and title, plus the price if any. */
  cardLabel: (parts: { kind: string; title: string; price?: string }) => string
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

const KIND_COLOR = { tour: 'grape', content: 'teal', user: 'blue', object: 'orange' } as const

/**
 * Where the result lives and who made it, as a quiet line under the title.
 * Kept apart from the duration/difficulty facts so the card adds context
 * without crowding its meta information; only what the source document
 * carries is shown (a content has an author but no direct museum, profiles
 * have neither).
 */
function CardByline({ item, labels }: { item: MarketplaceItem; labels: MarketplaceCardLabels }) {
  if (!item.museumName && !item.authorName) {
    return null
  }
  return (
    <Group gap="sm" wrap="wrap" c="dimmed">
      {item.museumName ? (
        <Group gap={4} wrap="nowrap" miw={0}>
          <Landmark size={13} aria-hidden />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {labels.atMuseum(item.museumName)}
          </Text>
        </Group>
      ) : null}
      {item.authorName ? (
        <Group gap={4} wrap="nowrap" miw={0}>
          <UserRound size={13} aria-hidden />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {labels.byAuthor(item.authorName)}
          </Text>
        </Group>
      ) : null}
    </Group>
  )
}

/**
 * Whether the card has a facts line at all. The card asks before rendering
 * `CardFacts`, because with no facts the description is its last line and the
 * footer can sit closer to it (an empty facts row would only add a gap).
 */
function hasFacts(item: MarketplaceItem) {
  if (item.kind === 'tour') {
    return Boolean(item.durationMinutes)
  }
  if (item.kind === 'content') {
    return Boolean(item.difficulty || item.durationSeconds)
  }
  if (item.kind === 'object') {
    return Boolean(item.artist)
  }
  // A profile always shows its handle.
  return true
}

/**
 * The kind's own facts, on the line above the footer: a tour's length, a
 * content's difficulty and reading time, a profile's handle, an object's
 * artist. Each kind shows only what it has.
 */
function CardFacts({
  item,
  locale,
  labels,
}: {
  item: MarketplaceItem
  locale: string
  labels: MarketplaceCardLabels
}) {
  if (!hasFacts(item)) {
    return null
  }
  return (
    // No `mt="auto"`: the facts stay in the stack's `xs` rhythm right under
    // whatever precedes them. Pushing them to the stack's bottom left a large
    // hole between a short card's title and its facts; the leftover height now
    // sits above the footer instead, where it reads as card breathing room.
    <Group gap="xs">
      {item.kind === 'tour' && item.durationMinutes ? (
        <Group gap={4}>
          <Clock size={14} aria-hidden />
          <Text size="xs" c="dimmed">
            {item.durationMinutes} {labels.min}
          </Text>
        </Group>
      ) : null}
      {item.kind === 'content' && item.difficulty ? (
        <DifficultyBadge difficulty={item.difficulty} size="xs">
          {labels.difficulty[item.difficulty]}
        </DifficultyBadge>
      ) : null}
      {item.kind === 'content' && item.durationSeconds ? (
        <Group gap={4}>
          <Clock size={14} aria-hidden />
          <Text size="xs" c="dimmed">
            {formatDuration(item.durationSeconds, locale)}
          </Text>
        </Group>
      ) : null}
      {item.kind === 'user' ? (
        <Group gap={4}>
          <AtSign size={14} aria-hidden />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.username}
          </Text>
        </Group>
      ) : null}
      {item.kind === 'object' && item.artist ? (
        <Text size="xs" c="dimmed" lineClamp={1}>
          {item.artist}
        </Text>
      ) : null}
    </Group>
  )
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
  const isObject = item.kind === 'object'
  // Only tours and contents are sellable: objects are catalog entries.
  const isPaid = (isTour || isContent) && item.priceCents > 0

  const href = `/${locale}/${item.kind}/${item.id}` as Route
  const kindLabel = labels[item.kind]
  const kindColor = KIND_COLOR[item.kind]
  const FallbackIcon = KIND_FALLBACK[item.kind].Icon
  // What the footer says: the amount for the sellable kinds, "Free" when it
  // costs nothing, and nothing for a profile or a catalog object (its footer
  // carries the action instead).
  let priceLabel: string | null = null
  if (isTour || isContent) {
    priceLabel = isPaid ? formatPrice(item.priceCents, item.currency, locale) : labels.free
  }
  // The card is one link: without this its accessible name is the whole
  // visible text (title, description, facts, price). Naming it by kind, title
  // and price keeps a screen reader's list of results quick to scan.
  const accessibleName = labels.cardLabel({
    kind: kindLabel,
    title: item.title,
    ...(priceLabel ? { price: priceLabel } : {}),
  })

  // The stack's `xs` rhythm separates the info lines; the footer then keeps
  // `sm` above it. When the description is the last line (no facts ticked in),
  // that `sm` plus the footer's own padding made the price look detached from
  // the text: the border and its padding already separate it, so drop the
  // extra margin there.
  const descriptionIsLast = Boolean(item.description) && !hasFacts(item)

  // `Link` wraps the card instead of being passed as Mantine's `component`:
  // a server component cannot hand the Link function to a client component.
  // The whole card is one link, so it gets Mantine's keyboard focus ring and
  // lifts (`shadow-md`, the app's hover lift) both on hover and while focused;
  // the group lets the inner Card answer the outer link's state.
  return (
    <Link
      href={href}
      aria-label={accessibleName}
      className="mantine-focus-auto group rounded-(--mantine-radius-lg)"
      style={{ display: 'block', height: '100%', color: 'inherit', textDecoration: 'none' }}
    >
      <Card
        withBorder
        shadow="sm"
        radius="lg"
        padding="sm"
        className="transition-shadow group-hover:shadow-md group-focus-visible:shadow-md"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <CardSection>
          <Box style={{ position: 'relative' }}>
            {item.imageUrl ? (
              <Image h={168} fit="cover" src={item.imageUrl} alt={item.imageAlt || item.title} />
            ) : (
              // The shared "image unavailable" placeholder (`KIND_FALLBACK`).
              <Box
                h={168}
                style={{
                  ...KIND_FALLBACK[item.kind].style,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FallbackIcon size={40} strokeWidth={1.5} aria-hidden />
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
          <CardByline item={item} labels={labels} />
          {item.description ? (
            <Text size="sm" c="dimmed" lineClamp={2}>
              {item.description}
            </Text>
          ) : null}

          <CardFacts item={item} locale={locale} labels={labels} />
        </Stack>

        {/* The section is full-bleed by design (it cancels the Card padding
            with negative margins). `inheritPadding` alone left the price and
            the "Free" label flush against the card border because this Card
            does not emit the orientation attribute Mantine's rule keys on, so
            the horizontal padding is set explicitly to the Card's own step:
            the decision line now aligns with the title above it. */}
        <CardSection withBorder py="sm" px="sm" mt={descriptionIsLast ? 0 : 'sm'}>
          <Group justify="space-between" wrap="nowrap">
            {isUser || isObject ? (
              <Text
                fw={700}
                c="light-dark(var(--mantine-color-museum-8), var(--mantine-color-museum-4))"
              >
                {isUser ? labels.viewProfile : labels.viewObject}
              </Text>
            ) : (
              <Text
                fw={700}
                // green.8 reads on the white card but is 3.9:1 on the dark
                // one: green.4 there.
                c={
                  isPaid
                    ? undefined
                    : 'light-dark(var(--mantine-color-green-8), var(--mantine-color-green-4))'
                }
              >
                {priceLabel}
              </Text>
            )}
            <ArrowUpRight size={16} aria-hidden />
          </Group>
        </CardSection>
      </Card>
    </Link>
  )
}
