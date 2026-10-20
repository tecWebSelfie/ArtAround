import type { Route } from 'next'
import Link from 'next/link'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { Museum, type Object as PayloadObject } from '@/payload-types'
import { Carousel, CarouselProps, CarouselSlide } from '@mantine/carousel'
import { AspectRatio, BackgroundImage, Stack, Text, Title } from '@mantine/core'
import { ComponentProps } from 'react'

import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

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
      <Title order={3} size="h5">
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

const CarouselCard = async ({
  object,
  ...props
}: ComponentProps<typeof CarouselSlide> & { object: PayloadObject }) => {
  const { lng } = await getT('objects-carousel')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null
  const facts = [object.artist, object.dating].filter(Boolean).join(' · ')

  return (
    <CarouselSlide {...props}>
      <Link
        href={`/${lng}/object/${object.id}` as Route}
        className="block rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)"
      >
        <AspectRatio ratio={1 / 1}>
          <BackgroundImage
            className="overflow-hidden rounded-xl transition-transform duration-300 hover:scale-[1.02]"
            src={thumbnail?.url ?? PLACEHOLDER_IMAGE}
          >
            {/* Bottom scrim: white type stays readable on any photograph. */}
            <Stack
              justify="flex-end"
              gap={2}
              className="h-full bg-linear-to-t from-black/75 via-black/15 to-transparent"
              p="sm"
            >
              <Title order={4} size="h6" c="white" lineClamp={2}>
                {object.name}
              </Title>
              {facts && (
                <Text size="xs" c="gray.3" lineClamp={1}>
                  {facts}
                </Text>
              )}
            </Stack>
          </BackgroundImage>
        </AspectRatio>
      </Link>
    </CarouselSlide>
  )
}
