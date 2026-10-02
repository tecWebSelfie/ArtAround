import { getT } from '@/i18n.server'
import { Museum, type Object as PayloadObject } from '@/payload-types'
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

export const ObjectsCarousel = async ({
  objects,
  ...props
}: CarouselProps & { objects: Museum['objects'] }) => {
  const { t } = await getT('objects-carousel')
  const validObjects = (objects ?? []).filter(
    (obj): obj is PayloadObject => typeof obj !== 'string',
  )

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
        <Title order={6}>{t('Objects')}</Title>
        <UnstyledButton
          variant="text"
          opacity={0.8}
          c="blue.6"
          className="transform hover:border-b"
        >
          <Text>{t('See more') + ' >'}</Text>
        </UnstyledButton>
      </Group>
      <Carousel
        {...props}
        emblaOptions={{
          align: 'start',
        }}
        slideSize={{ base: '70%', sm: '33.3333%', md: '25%' }}
        slideGap="sm"
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
  const { t } = await getT('objects-carousel-card')
  const thumbnail =
    object.thumbnail && typeof object.thumbnail === 'object' ? object.thumbnail : null

  return (
    <CarouselSlide {...props}>
      <AspectRatio ratio={1 / 1}>
        <BackgroundImage
          className="rounded-xl"
          src={thumbnail?.url ?? 'https://placehold.co/600x400?text=Placeholder'}
        >
          <Stack justify="space-between" className="h-full" p="sm">
            <Title order={6}>{object.name}</Title>
            <Stack>
              <Group justify="end">
                <Button size="compact-sm" variant="default">
                  {t('See more')}
                </Button>
              </Group>
            </Stack>
          </Stack>
        </BackgroundImage>
      </AspectRatio>
    </CarouselSlide>
  )
}
