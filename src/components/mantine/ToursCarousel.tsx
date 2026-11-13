'use client'

import { isPopulated } from '@/lib/isPopulated'
import { pictureSrc } from '@/lib/picture'
import { summarizeTour } from '@/lib/tour-summary'
import { formatUnit } from '@/lib/duration'
import type { Tour } from '@/payload-types'
import { DepthSelect } from '@gfazioli/mantine-depth-select'
import { ActionIcon, AspectRatio, Button, Group, Image, Stack, Title } from '@mantine/core'
import { ArrowRight, ChevronLeft, ChevronRight, Clock, ImageOff, MapPin } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from './ToursCarousel.module.css'

/** The pager's two chevrons share everything but direction. */
const PAGER_BUTTON = { size: 'xl', radius: 'xl', variant: 'subtle', color: 'gray' } as const

/**
 * A museum's (or an author's) tours as a stacked deck, the tour identity's
 * one playful discovery component (DESIGN.md → Components → Tour deck).
 *
 * The section reads "Tours" with a "See all" pill to the tour search. The
 * front card is the way into its tour: one link laid over the deck (cards in
 * the DepthSelect listbox stay non-interactive options), with a small "go"
 * button that nudges right on hover. A pager of light chevrons and page dots
 * flips through the deck; with a single tour it is left out.
 */
export const ToursCarousel = ({ tours }: { tours: Tour[] }) => {
  const [index, setIndex] = useState(0)
  const { t } = useTranslation('tours-carousel')
  const { lng } = useParams<{ lng: string }>()

  // Clamped: a shorter `tours` (a refetched or filtered list) must not leave
  // the deck pointing past its end.
  const shown = Math.min(index, Math.max(tours.length - 1, 0))
  const current = tours[shown]

  // The cards only change with the tours: flipping the deck re-renders the
  // section, not every card's figures.
  const cards = useMemo(
    () => tours.map((tour) => ({ value: tour.id, view: <TourCard tour={tour} lng={lng} /> })),
    [tours, lng],
  )

  const select = (tourId: string | number) => {
    const found = tours.findIndex((tour) => tour.id === tourId)
    if (found !== -1) setIndex(found)
  }

  return (
    <Stack component="section" gap="md">
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        {/* h2: the deck is a section of its page (museum, profile), right
            under the h1; the pager counts the tours, so the title doesn't. */}
        <Title order={2} size="h5">
          {t('Tours')}
        </Title>
        {/* A hairline pill: a control at rest, secondary to the cards. */}
        <Button
          component={Link}
          href={`/${lng}/search/tours` as Route}
          variant="default"
          radius="xl"
          size="compact-sm"
          rightSection={<ChevronRight size={16} aria-hidden />}
        >
          {t('See all')}
        </Button>
      </Group>
      <div className={classes.stage}>
        <AspectRatio ratio={16 / 10}>
          <DepthSelect
            value={current?.id}
            onChange={select}
            withControls={false}
            visibleCards={3}
            transitionDuration={500}
            scaleStep={0.06}
            translateYStep={10}
            opacityStep={0.1}
            blurStep={0.7}
            data={cards}
          />
        </AspectRatio>
        {current && (
          <Link
            href={`/${lng}/tour/${current.id}` as Route}
            className={classes.open}
            aria-label={t('Open the tour {{title}}', { title: current.title })}
          />
        )}
      </div>
      {tours.length > 1 && (
        <Group justify="center" gap={2} className={classes.pager}>
          <ActionIcon
            {...PAGER_BUTTON}
            aria-label={t('Show previous tour')}
            onClick={() => setIndex(shown - 1)}
            disabled={shown <= 0}
          >
            <ChevronLeft size={20} aria-hidden />
          </ActionIcon>
          <div className={classes.dots} aria-hidden>
            {tours.map((tour, i) => (
              <span key={tour.id} data-active={i === shown || undefined} />
            ))}
          </div>
          <ActionIcon
            {...PAGER_BUTTON}
            aria-label={t('Show next tour')}
            onClick={() => setIndex(shown + 1)}
            disabled={shown >= tours.length - 1}
          >
            <ChevronRight size={20} aria-hidden />
          </ActionIcon>
          {/* The dots are visual only: this says where the visitor is. */}
          <span className="sr-only" aria-live="polite">
            {t('{{current}} of {{total}}', { current: shown + 1, total: tours.length })}
          </span>
        </Group>
      )}
    </Stack>
  )
}

/**
 * One card of the deck: the cover under a plum scrim with the title and its
 * figures, the gradient foot line, and the "go" button that only the front
 * card shows. Without a cover, or when the photo fails to load, a quiet
 * neutral surface with the "image unavailable" mark stands in: a muted,
 * deliberate placeholder rather than a broken image. Purely presentational:
 * it sits in a `role="option"`.
 */
const TourCard = ({ tour, lng }: { tour: Tour; lng: string }) => {
  // Its own `t`: i18next-cli finds the namespace only on `useTranslation`.
  const { t } = useTranslation('tours-carousel')
  const summary = summarizeTour(tour)
  const src = isPopulated(tour.thumbnail) ? pictureSrc(tour.thumbnail, 'card') : null
  const [failed, setFailed] = useState(false)
  const cover = failed ? null : src
  return (
    // The neutral surface is always under the cover, so the card stays
    // opaque while the photo loads instead of showing the cards behind it.
    <div className={classes.card}>
      {cover ? (
        <Image
          src={cover}
          alt=""
          fit="cover"
          h="100%"
          w="100%"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={classes.cover}
        />
      ) : (
        <ImageOff className={classes.mark} size={36} strokeWidth={1.5} aria-hidden />
      )}
      <div className={classes.caption}>
        <Stack gap={4} miw={0}>
          {/* h3: under the section's "Tours" h2. */}
          <Title order={3} fz="1.25rem" fw={700} lh={1.2} c="white" lineClamp={2}>
            {tour.title}
          </Title>
          <div className={classes.facts}>
            <span>
              <MapPin size={13} aria-hidden />
              {t('{{count}} stops', { count: summary.stops })}
            </span>
            {summary.visitMinutes != null && (
              <span>
                <Clock size={13} aria-hidden />
                {formatUnit(summary.visitMinutes, 'minute', lng)}
              </span>
            )}
          </div>
        </Stack>
        <span className={classes.go} aria-hidden>
          <ArrowRight size={16} />
        </span>
      </div>
    </div>
  )
}
