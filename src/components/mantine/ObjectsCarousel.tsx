import type { Route } from 'next'
import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import { Museum, type Object as PayloadObject } from '@/payload-types'
import { BorderAnimate } from '@gfazioli/mantine-border-animate'
import { Carousel, CarouselProps, CarouselSlide } from '@mantine/carousel'
import {
  ActionIcon,
  AspectRatio,
  BackgroundImage,
  Button,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { ChevronRight } from 'lucide-react'
import { ComponentProps } from 'react'

import Link from 'next/link'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

export const ObjectsCarousel = async ({
  objects,
  ...props
}: CarouselProps & { objects: Museum['objects'] }) => {
  const { t } = await getT('objects-carousel')
  const validObjects = filterPopulated<PayloadObject>(objects)

  if (validObjects.length === 0) {
    return (
      <Text size="sm" color="gray">
        {t('No objects available')}
      </Text>
    )
  }

  return (
    <Stack>
      <Group align="center" gap="sm">
        <Title size="1em">{t('Objects')}</Title>
        <UnstyledButton variant="text" c="blue.8" className="transform hover:border-b">
          <Text size="sm">{t('See more') + ' >'}</Text>
        </UnstyledButton>
      </Group>
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
        <CarouselSlide>
          <Stack justify="center" align="center" className="h-full">
            <ActionIcon
              variant="outline"
              color="gray"
              radius={'lg'}
              aria-label={t('See more objects')}
            >
              <ChevronRight size={16} />
            </ActionIcon>
            <Text size="sm" color="gray">
              {t('See more objects')}
            </Text>
          </Stack>
        </CarouselSlide>
      </Carousel>
    </Stack>
  )
}

const CarouselCard = async ({
  object,
  ...props
}: ComponentProps<typeof CarouselSlide> & { object: PayloadObject }) => {
  const { t, lng } = await getT('objects-carousel-card')
  const thumbnail = isPopulated(object.thumbnail) ? object.thumbnail : null

  return (
    <CarouselSlide {...props}>
      <AspectRatio ratio={1 / 1}>
        <BackgroundImage
          className="rounded-xl"
          src={thumbnail?.url ?? PLACEHOLDER_IMAGE}
        >
          <Stack justify="space-between" className="h-full" p="sm">
            <Title order={2} size="h6">
              {object.name}
            </Title>
            <Stack>
              <Group justify="end">
                <BorderAnimate variant="glow">
                  <Button
                    component={Link}
                    href={`/${lng}/object/${object.id}` as Route}
                    size="compact-sm"
                    variant="outline"
                    className="bg-white"
                    classNames={{ root: 'border-none' }}
                  >
                    {t('View details')}
                  </Button>
                </BorderAnimate>
              </Group>
            </Stack>
          </Stack>
        </BackgroundImage>
      </AspectRatio>
    </CarouselSlide>
  )
}
