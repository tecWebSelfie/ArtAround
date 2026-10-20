import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import { backToTourHref, type TourPicker } from '@/lib/tour-picker'
import type { Content, ContentImage } from '@/payload-types'
import { LinkButton } from '@/components/editing/LinkButton'
import { Badge, Group, Text } from '@mantine/core'
import { Check, Clock, Plus } from 'lucide-react'
import type { Route } from 'next'

import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'
import { LockedPriceBadge } from './LockedPriceBadge'
import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

/**
 * Contents search results. With a `picker` (the tour editor's "add a stop"
 * round trip, `src/lib/tour-picker.ts`) every card also carries its tour
 * action: "Add to tour" back to the editor, or a static "In the tour" for
 * stops the draft already has. `lockedPrices` flags paid contents the
 * visitor can't read, so the author sees the cost before adding one.
 */
export const ContentsSearchResults = async ({
  contents,
  picker,
  lockedPrices,
}: {
  contents: readonly (string | Content | null | undefined)[] | null | undefined
  picker?: TourPicker | null
  /** Content id → price (cents) for contents locked to this visitor. */
  lockedPrices?: ReadonlyMap<string, number>
}) => {
  const { t } = await getT('search')

  return (
    <SearchResultsGrid
      items={filterPopulated<Content>(contents)}
      getKey={(content) => content.id}
      emptyLabel={t('No contents found')}
      renderItem={(content) => {
        const thumbnail = filterPopulated<ContentImage>(content.images)[0] ?? null
        const lockedPrice = lockedPrices?.get(content.id)
        const inTour = picker?.have.includes(content.id)
        return (
          <SearchResultCard
            variant="content"
            imageUrl={thumbnail?.url}
            imageAlt={thumbnail?.alt ?? content.title}
            title={content.title}
          >
            <Group gap="xs">
              <DifficultyBadge difficulty={content.difficulty}>
                {t(DIFFICULTY_LABEL_KEY[content.difficulty])}
              </DifficultyBadge>
              {/* 0 is the estimator's "under a minute" on older documents. */}
              {content.readingTimeMins ? (
                <Group gap={4}>
                  <Clock size={14} aria-hidden />
                  <Text size="xs" c="dimmed">
                    {content.readingTimeMins} {t('min read')}
                  </Text>
                </Group>
              ) : null}
              {lockedPrice != null && <LockedPriceBadge price={lockedPrice} size="sm" />}
            </Group>
            {picker &&
              (inTour ? (
                <Badge
                  mt="xs"
                  variant="light"
                  color="teal"
                  size="lg"
                  leftSection={<Check size={14} aria-hidden />}
                >
                  {t('In the tour')}
                </Badge>
              ) : (
                // LinkButton, not `Button component={Link}`: this is a server
                // component, and a component can't be passed as a prop to a client one.
                <LinkButton
                  mt="xs"
                  href={backToTourHref(picker.returnTo, content.id) as Route}
                  color="teal"
                  autoContrast
                  leftSection={<Plus size={16} aria-hidden />}
                  aria-label={t('Add {{title}} to the tour', { title: content.title })}
                >
                  {t('Add to tour')}
                </LinkButton>
              ))}
          </SearchResultCard>
        )
      }}
    />
  )
}
