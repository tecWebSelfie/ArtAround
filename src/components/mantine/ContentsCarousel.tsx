import type { Route } from 'next'
import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import { stopImage } from '@/lib/tour-summary'
import type { Content } from '@/payload-types'
import { Carousel, CarouselProps } from '@mantine/carousel'
import { Group, Stack, Text, Title } from '@mantine/core'
import { Clock } from 'lucide-react'

import { CoverCard } from './CoverCard'
import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'
import { formatDuration } from '@/lib/duration'

export { DIFFICULTY_LABEL_KEY, DIFFICULTY_META } from './DifficultyBadge'

/**
 * A creator's contents as a swipeable row of square cards, the sibling of
 * `ObjectsCarousel`: each `CoverCard` is one link to the content page, titled
 * over a bottom scrim with its difficulty and reading time. The 2px teal outline is
 * the content identity (DESIGN.md → Colors). No "See more" controls: there is
 * no listing page behind them, and the row already holds every content.
 */
export const ContentsCarousel = async ({
  contents,
  ...props
}: CarouselProps & { contents: (string | Content)[] | null | undefined }) => {
  const { t } = await getT('contents-carousel')
  const validContents = filterPopulated<Content>(contents)

  if (validContents.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('No contents available')}
      </Text>
    )
  }

  return (
    <Stack>
      {/* h2: the carousel is a section of its page, right under the h1. */}
      <Title order={2} size="h5">
        {t('Contents')}{' '}
        <Text span c="dimmed" fw={400} inherit className="tabular-nums">
          {validContents.length}
        </Text>
      </Title>
      <Carousel
        {...props}
        emblaOptions={{
          align: 'start',
        }}
        slideSize={{ base: '60%', sm: '33.3333%', md: '25%' }}
        slideGap="sm"
        withControls={false}
      >
        {validContents.map((content) => (
          <ContentsCarouselCard content={content} key={content.id} />
        ))}
      </Carousel>
    </Stack>
  )
}

const ContentsCarouselCard = async ({ content }: { content: Content }) => {
  const { t, lng } = await getT('contents-carousel-card')
  // The content's own picture, else the object it talks about (as tour stops).
  const image = stopImage(content)

  return (
    <CoverCard
      href={`/${lng}/content/${content.id}` as Route}
      imageUrl={image?.url}
      title={content.title}
      outline="var(--mantine-color-teal-6)"
    >
      <Group gap="xs">
        <DifficultyBadge difficulty={content.difficulty} size="xs">
          {t(DIFFICULTY_LABEL_KEY[content.difficulty])}
        </DifficultyBadge>
        {content.durationSeconds ? (
          <Group gap={4}>
            <Clock size={12} className="text-white" aria-hidden />
            <Text size="xs" c="gray.3">
              {formatDuration(content.durationSeconds, lng)}
            </Text>
          </Group>
        ) : null}
      </Group>
    </CoverCard>
  )
}
