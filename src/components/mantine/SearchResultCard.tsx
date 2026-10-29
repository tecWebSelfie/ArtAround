/**
 * Shared listing pieces for the search pages (`/search/tours|objects|contents`).
 *
 * `SearchResultsGrid` owns the responsive grid (1 / 2 / 3 columns) and the
 * dimmed empty state; `SearchResultCard` is the calm result container recorded
 * in DESIGN.md (`Card shadow="sm" padding="sm" radius="md" withBorder`, 160px
 * cover image, one-line title, two-line description). Domain-specific details
 * (difficulty, reading time, actions) go in `children`, below the text.
 *
 * Hook-free on purpose so the async Server Components that fetch search results
 * can render it directly.
 */
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'
import { Box, Card, CardSection, Grid, GridCol, Image, Stack, Text } from '@mantine/core'
import type { Route } from 'next'
import Link from 'next/link'
import type { Key, ReactNode } from 'react'

export function SearchResultsGrid<T>({
  items,
  getKey,
  renderItem,
  emptyLabel,
}: {
  items: readonly T[]
  getKey: (item: T) => Key
  renderItem: (item: T) => ReactNode
  /** Already translated: the grid sits under pages with different namespaces. */
  emptyLabel: string
}) {
  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyLabel}
      </Text>
    )
  }

  return (
    <Grid>
      {items.map((item) => (
        // `GridCol`, not `Grid.Col`: compound members of client components are
        // undefined when rendered from a server component.
        <GridCol key={getKey(item)} span={{ base: 12, sm: 6, md: 4 }}>
          {renderItem(item)}
        </GridCol>
      ))}
    </Grid>
  )
}

export function SearchResultCard({
  imageUrl,
  imageAlt,
  title,
  description,
  variant = 'default',
  href,
  children,
}: {
  /** Falls back to the shared placeholder when the document has no image. */
  imageUrl?: string | null
  imageAlt: string
  title: string
  description?: string | null
  /** `content` adds the 2px teal outline that marks contents across the app. */
  variant?: 'default' | 'content'
  /**
   * The result's own page. The whole card becomes its click target through a
   * stretched link on the title (one link, named by the title, so screen
   * readers don't hear the card twice); `children` actions stay above it and
   * keep their own targets. The shadow lifts on hover, as on the navigator's QR card.
   */
  href?: Route
  children?: ReactNode
}) {
  const titleText = (
    <Text fw={500} lineClamp={1}>
      {title}
    </Text>
  )
  return (
    <Card
      shadow="sm"
      padding="sm"
      radius="md"
      withBorder
      pos={href ? 'relative' : undefined}
      className={
        [
          variant === 'content' ? 'border-2 border-solid border-teal-600' : '',
          href ? 'transition-shadow hover:shadow-md has-[a:focus-visible]:shadow-md' : '',
        ]
          .join(' ')
          .trim() || undefined
      }
    >
      <CardSection>
        <Image h={160} fit="cover" src={imageUrl || PLACEHOLDER_IMAGE} alt={imageAlt} />
      </CardSection>
      <Stack gap={4} mt="xs">
        {href ? (
          <Link href={href} className="text-inherit no-underline after:absolute after:inset-0">
            {titleText}
          </Link>
        ) : (
          titleText
        )}
        {description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {description}
          </Text>
        )}
        {/* Above the stretched link, so actions (Add to tour…) stay clickable. */}
        {children && (href ? <Box className="relative z-[1]">{children}</Box> : children)}
      </Stack>
    </Card>
  )
}
