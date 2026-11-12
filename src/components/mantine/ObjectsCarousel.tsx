import type { Route } from 'next'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { Museum, type Object as PayloadObject } from '@/payload-types'
import { Carousel, CarouselProps } from '@mantine/carousel'
import { Stack, Text, Title } from '@mantine/core'

import { CoverCard } from './CoverCard'

/**
 * The museum's objects as a swipeable row of square cards. Each card is one
 * link to the object page, titled over a bottom scrim with the object's own
 * facts (artist, dating) so the row reads as a collection, not just photos.
 */
export const ObjectsCarousel = async ({
  objects,
  ...props
}: CarouselProps & { objects: Museum['objects'] }) => {
  const { t } = await getT('objects-carousel')
  const validObjects = filterPopulated<PayloadObject>(objects)

  if (validObjects.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('No objects available')}
      </Text>
    )
  }

  return (
    <Stack>
      {/* h2: the carousel is a section of its page, right under the h1. */}
      <Title order={2} size="h5">
        {t('Objects')}{' '}
        <Text span c="dimmed" fw={400} inherit className="tabular-nums">
          {validObjects.length}
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
        {validObjects.map((object) => (
          <CarouselCard object={object} key={object.id} />
        ))}
      </Carousel>
    </Stack>
  )
}

const CarouselCard = async ({ object }: { object: PayloadObject }) => {
  const { lng } = await getT('objects-carousel')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const facts = [object.artist, object.dating].filter(Boolean).join(' · ')

  return (
    <CoverCard
      href={`/${lng}/object/${object.id}` as Route}
      imageUrl={thumbnail?.url}
      title={object.name}
    >
      {facts && (
        <Text size="xs" c="gray.3" lineClamp={1}>
          {facts}
        </Text>
      )}
    </CoverCard>
  )
}
