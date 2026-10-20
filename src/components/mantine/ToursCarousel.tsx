'use client'

import { isPopulated } from '@/lib/isPopulated'
import { summarizeTour } from '@/lib/tour-summary'
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
import { ArrowRight, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PLACEHOLDER_IMAGE } from '@/lib/placeholder-image'

const TEXT_GRADIENT_ID = 'textGradient'

/**
 * The museum's (or an author's) tours as a stacked deck, the tour identity's
 * one playful discovery component. The deck selects; the footer button opens
 * the selected tour, so the cards themselves stay non-interactive options.
 * Each card carries its figures (stops, minutes) so a visitor can compare
 * tours while flipping through them, before opening one.
 */
export const ToursCarousel = ({ tours, ...props }: BorderAnimateProps & { tours: Tour[] }) => {
  const [index, setIndex] = useState(0)
  const { t } = useTranslation('tours-carousel')
  const { lng } = useParams<{ lng: string }>()

  const currentTour = tours[index]
  const currentTourId = currentTour?.id

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
            <Group align="center" justify="space-between" className="h-full">
              <Badge radius="xl" variant="white" className="py-3">
                <Text
                  className="font-semibold"
                  variant="gradient"
                  gradient={{ from: 'grape', to: 'orange' }}
                >
                  {t('Tours')}
                </Text>
              </Badge>
              {/* Where the visitor is in the deck: the arrows alone don't say how many remain. */}
              {tours.length > 1 && (
                <Text size="sm" fw={600} c="white" className="tabular-nums">
                  {t('{{current}} of {{total}}', { current: index + 1, total: tours.length })}
                </Text>
              )}
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
                    view: <TourCard tour={tour} lng={lng} />,
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
          {currentTour && (
            <CardSection className="p-2">
              <Button
                component={Link}
                href={`/${lng}/tour/${currentTour.id}` as Route}
                fullWidth
                variant="white"
                rightSection={<ArrowRight size={16} aria-hidden />}
                aria-label={t('Open the tour {{title}}', { title: currentTour.title })}
              >
                {t('Open this tour')}
              </Button>
            </CardSection>
          )}
        </Card>
      </BorderAnimate>
    </>
  )
}

/**
 * One card of the deck: the cover under a bottom scrim that keeps the white
 * title and figures readable on any photo. Purely presentational (it sits in a
 * `role="option"`), so it holds no link or button of its own.
 */
const TourCard = ({ tour, lng, ...props }: CardProps & { tour: Tour; lng: string }) => {
  const { t } = useTranslation('tours-carousel')
  const summary = summarizeTour(tour)
  const minutes = summary.visitMinutes
  return (
    <Card className="h-full p-0 border-solid border  border-mantine-grape-6" {...props}>
      <BackgroundImage
        src={
          isPopulated(tour.thumbnail) && tour.thumbnail.url ? tour.thumbnail.url : PLACEHOLDER_IMAGE
        }
        className="h-full"
      >
        <Center className="h-full items-end bg-linear-to-t from-black/75 via-black/20 to-transparent">
          <Stack gap={4} className="w-full" p="sm">
            <Title order={3} size="h5" className="text-white" lineClamp={2}>
              {tour.title}
            </Title>
            <Group gap="sm" c="white" fz="xs" fw={500}>
              <Group gap={4} wrap="nowrap">
                <MapPin size={14} aria-hidden />
                {t('{{count}} stops', { count: summary.stops })}
              </Group>
              {minutes != null && (
                <Group gap={4} wrap="nowrap">
                  <Clock size={14} aria-hidden />
                  {new Intl.NumberFormat(lng, {
                    style: 'unit',
                    unit: 'minute',
                    unitDisplay: 'short',
                  }).format(minutes)}
                </Group>
              )}
            </Group>
          </Stack>
        </Center>
      </BackgroundImage>
    </Card>
  )
}
