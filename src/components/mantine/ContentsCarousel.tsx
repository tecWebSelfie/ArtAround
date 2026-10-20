import type { Route } from 'next'
import Link from 'next/link'
import { getT } from '@/i18n.server'
import { filterPopulated } from '@/lib/isPopulated'
import { stopImage } from '@/lib/tour-summary'
import type { Content } from '@/payload-types'
import { Carousel, CarouselProps, CarouselSlide } from '@mantine/carousel'
import { AspectRatio, BackgroundImage, Group, Stack, Text, Title } from '@mantine/core'
import { Clock } from 'lucide-react'
import { ComponentProps } from 'react'

import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

export { DIFFICULTY_LABEL_KEY, DIFFICULTY_META } from './DifficultyBadge'

/**
 * A creator's contents as a swipeable row of square cards, the sibling of
 * `ObjectsCarousel`: each card is one link to the content page, titled over a
 * bottom scrim with its difficulty and reading time. The 2px teal outline is
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
      <Title order={3} size="h5">
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

const ContentsCarouselCard = async ({
  content,
  ...props
}: Omit<ComponentProps<typeof CarouselSlide>, 'content'> & { content: Content }) => {
  const { t, lng } = await getT('contents-carousel-card')
  // The content's own picture, else the object it talks about (as tour stops).
  const image = stopImage(content)

  return (
    <CarouselSlide {...props}>
      <Link
        href={`/${lng}/content/${content.id}` as Route}
        className="block rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)"
      >
        <AspectRatio ratio={1 / 1}>
          <BackgroundImage
            className="overflow-hidden rounded-xl border-2 border-solid border-teal-600 transition-transform duration-300 hover:scale-[1.02]"
            src={image?.url ?? PLACEHOLDER_IMAGE}
          >
            {/* Bottom scrim: white type stays readable on any photograph. */}
            <Stack
              justify="flex-end"
              gap={6}
              className="h-full bg-linear-to-t from-black/75 via-black/15 to-transparent"
              p="sm"
            >
              <Title order={4} size="h6" c="white" lineClamp={2}>
                {content.title}
              </Title>
              <Group gap="xs">
                <DifficultyBadge difficulty={content.difficulty} size="xs">
                  {t(DIFFICULTY_LABEL_KEY[content.difficulty])}
                </DifficultyBadge>
                {/* 0 is the estimator's "under a minute" on older documents. */}
                {content.readingTimeMins ? (
                  <Group gap={4}>
                    <Clock size={12} className="text-white" aria-hidden />
                    <Text size="xs" c="gray.3">
                      {content.readingTimeMins} {t('min read')}
                    </Text>
                  </Group>
                ) : null}
              </Group>
            </Stack>
          </BackgroundImage>
        </AspectRatio>
      </Link>
    </CarouselSlide>
  )
}
