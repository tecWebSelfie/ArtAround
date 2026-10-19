import { getT } from '@/i18n.server'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Content, ContentImage } from '@/payload-types'
import { Carousel, CarouselProps, CarouselSlide } from '@mantine/carousel'
import {
  ActionIcon,
  AspectRatio,
  BackgroundImage,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { ChevronRight, Clock } from 'lucide-react'
import { ComponentProps } from 'react'

import { DIFFICULTY_LABEL_KEY, DifficultyBadge } from './DifficultyBadge'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

export { DIFFICULTY_LABEL_KEY, DIFFICULTY_META } from './DifficultyBadge'

export const ContentsCarousel = async ({
  contents,
  ...props
}: CarouselProps & { contents: (string | Content)[] | null | undefined }) => {
  const { t } = await getT('contents-carousel')
  const validContents = filterPopulated<Content>(contents)

  if (validContents.length === 0) {
    return (
      <Text size="sm" color="gray">
        {t('No contents available')}
      </Text>
    )
  }

  return (
    <Stack>
      <Group align="center" gap="sm">
        <Badge radius="xl" variant="white" className="border border-teal-600 py-3">
          <Text
            className="font-semibold"
            variant="gradient"
            gradient={{ from: 'teal', to: 'cyan' }}
          >
            {t('Contents')}
          </Text>
        </Badge>
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
        {validContents.map((content) => (
          <ContentsCarouselCard content={content} key={content.id} />
        ))}
        <CarouselSlide>
          <Stack justify="center" align="center" className="h-full">
            <ActionIcon
              variant="outline"
              color="gray"
              radius={'lg'}
              aria-label={t('See more contents')}
            >
              <ChevronRight size={16} />
            </ActionIcon>
            <Text size="sm" color="gray">
              {t('See more contents')}
            </Text>
          </Stack>
        </CarouselSlide>
      </Carousel>
    </Stack>
  )
}

const ContentsCarouselCard = async ({
  content,
  ...props
}: Omit<ComponentProps<typeof CarouselSlide>, 'content'> & { content: Content }) => {
  const { t } = await getT('contents-carousel-card')
  const thumbnail = filterPopulated<ContentImage>(content.images)[0] ?? null

  return (
    <CarouselSlide {...props}>
      <AspectRatio ratio={1 / 1}>
        <BackgroundImage
          className="rounded-xl border-2 border-solid border-teal-600"
          src={
            isPopulated(thumbnail) && thumbnail.url
              ? thumbnail.url
              : PLACEHOLDER_IMAGE
          }
        >
          <Stack justify="space-between" className="h-full" p="sm">
            <Title order={2} size="h6" className="text-white" lineClamp={2}>
              {content.title}
            </Title>
            <Stack gap="xs">
              <Group gap="xs">
                <DifficultyBadge difficulty={content.difficulty}>
                  {t(DIFFICULTY_LABEL_KEY[content.difficulty])}
                </DifficultyBadge>
                {content.readingTimeMins != null && (
                  <Group gap={4}>
                    <Clock size={14} className="text-white" aria-hidden />
                    <Text size="xs" c="white">
                      {content.readingTimeMins} {t('min read')}
                    </Text>
                  </Group>
                )}
              </Group>
              <Group justify="end">
                <Button size="compact-sm" variant="default">
                  {t('View details')}
                </Button>
              </Group>
            </Stack>
          </Stack>
        </BackgroundImage>
      </AspectRatio>
    </CarouselSlide>
  )
}
