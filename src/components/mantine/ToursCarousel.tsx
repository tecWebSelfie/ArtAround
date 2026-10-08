'use client'

import { isPopulated } from '@/lib/isPopulated'
import { Tour } from '@/payload-types'
import { BorderAnimate, type BorderAnimateProps } from '@gfazioli/mantine-border-animate'
import { DepthSelect } from '@gfazioli/mantine-depth-select'
import {
  ActionIcon,
  AspectRatio,
  BackgroundImage,
  Badge,
  Button,
  Card,
  CardProps,
  CardSection,
  Center,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const TEXT_GRADIENT_ID = 'textGradient'

export const ToursCarousel = ({ tours, ...props }: BorderAnimateProps & { tours: Tour[] }) => {
  const [index, setIndex] = useState(0)
  const { t } = useTranslation('tours-carousel')

  const currentTourId = tours[index]?.id

  const set = (tourId: string | number) => {
    const newIndex = tours.findIndex((tour) => tour.id === tourId)
    if (newIndex !== -1) {
      setIndex(newIndex)
    }
  }

  const previous = () => {
    if (index > 0) {
      setIndex(index - 1)
    }
  }

  const next = () => {
    if (index < tours.length - 1) {
      setIndex(index + 1)
    }
  }

  return (
    <>
      <svg width={0} height={0} className="absolute" aria-hidden>
        <defs>
          <linearGradient id={TEXT_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-purple-700, #7e22ce)" />
            <stop offset="100%" stopColor="var(--color-orange-400, #fb923c)" />
          </linearGradient>
        </defs>
      </svg>
      <BorderAnimate {...props}>
        <Card
          shadow="lg"
          padding="sm"
          className="w-full bg-linear-to-br from-purple-700 to-orange-400"
        >
          <CardSection inheritPadding withBorder py="xs">
            <Group align="center" className="h-full">
              <Badge radius="xl" variant="white" className="py-3">
                <Text
                  className="font-semibold"
                  variant="gradient"
                  gradient={{ from: 'grape', to: 'orange' }}
                >
                  {t('Tours')}
                </Text>
              </Badge>
            </Group>
          </CardSection>
          <CardSection pt="md" inheritPadding>
            {/* Controls live outside DepthSelect: buttons inside its
                role="listbox" root trip the aria-required-children rule. */}
            <Group wrap="nowrap" gap="xs">
              <AspectRatio ratio={16 / 10} style={{ flex: '1 1 auto' }} miw={0}>
                <DepthSelect
                  value={currentTourId}
                  onChange={set}
                  withControls={false}
                  visibleCards={3}
                  transitionDuration={500}
                  scaleStep={0.06}
                  translateYStep={10}
                  opacityStep={0.1}
                  blurStep={0.7}
                  data={tours.map((tour) => ({
                    value: tour.id,
                    view: <TourCard tour={tour} />,
                  }))}
                />
              </AspectRatio>
              <Stack justify="center" align="center" className=" h-11/12 py-1">
                <BorderAnimate radius="xl">
                  <ActionIcon
                    radius="xl"
                    variant="white"
                    autoContrast
                    className="border-mantine-grape-6 disabled:opacity-60"
                    aria-label={t('Show next tour')}
                    onClick={() => next()}
                    disabled={index >= tours.length - 1}
                  >
                    <ChevronUp size={18} stroke={`url(#${TEXT_GRADIENT_ID})`} />
                  </ActionIcon>
                </BorderAnimate>
                <BorderAnimate radius="xl">
                  <ActionIcon
                    radius="xl"
                    variant="white"
                    autoContrast
                    className="border-mantine-grape-6 disabled:opacity-60"
                    aria-label={t('Show previous tour')}
                    onClick={() => previous()}
                    disabled={index <= 0}
                  >
                    <ChevronDown size={18} stroke={`url(#${TEXT_GRADIENT_ID})`} />
                  </ActionIcon>
                </BorderAnimate>
              </Stack>
            </Group>
          </CardSection>
          <CardSection className="p-2">
            <Button className="w-full" variant="white">
              Explore all tours
            </Button>
          </CardSection>
        </Card>
      </BorderAnimate>
    </>
  )
}

const TourCard = ({ tour, ...props }: CardProps & { tour: Tour }) => {
  return (
    <Card className="h-full p-0 border-solid border  border-mantine-grape-6" {...props}>
      <BackgroundImage
        src={
          isPopulated(tour.thumbnail) && tour.thumbnail.url
            ? tour.thumbnail.url
            : 'https://placehold.co/600x400?text=Placeholder'
        }
        className="h-full"
      >
        <Center className="h-full">
          <Stack justify="space-between" className="w-full h-full" p={'xs'}>
            <Title order={3} size="h5" className="text-white" lineClamp={1}>
              {tour.title}
            </Title>
            <Group justify="end">
              <BorderAnimate variant="glow">
                {/* Rendered as non-interactive text: the card views sit inside
                    role="option" elements, so a real button here trips the
                    nested-interactive and aria-hidden-focus rules. Restore
                    the Button once a details action is wired up. */}
                <Button
                  component="span"
                  classNames={{
                    label:
                      'bg-linear-to-r from-purple-700 to-orange-400 bg-clip-text text-transparent',
                    root: 'border-none',
                  }}
                  size="compact-sm"
                  variant="outline"
                  className="bg-white"
                >
                  View details
                </Button>
              </BorderAnimate>
            </Group>
          </Stack>
        </Center>
      </BackgroundImage>
    </Card>
  )
}
