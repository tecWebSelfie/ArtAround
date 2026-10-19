import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import type { Content, ContentImage } from '@/payload-types'
import { Group, Text } from '@mantine/core'
import { Clock } from 'lucide-react'

import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'
import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

export const ContentsSearchResults = async ({
  contents,
}: {
  contents: readonly (string | Content | null | undefined)[] | null | undefined
}) => {
  const { t } = await getT('search')

  return (
    <SearchResultsGrid
      items={filterPopulated<Content>(contents)}
      getKey={(content) => content.id}
      emptyLabel={t('No contents found')}
      renderItem={(content) => {
        const thumbnail = filterPopulated<ContentImage>(content.images)[0] ?? null
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
              {content.readingTimeMins != null && (
                <Group gap={4}>
                  <Clock size={14} aria-hidden />
                  <Text size="xs" c="dimmed">
                    {content.readingTimeMins} {t('min read')}
                  </Text>
                </Group>
              )}
            </Group>
          </SearchResultCard>
        )
      }}
    />
  )
}
