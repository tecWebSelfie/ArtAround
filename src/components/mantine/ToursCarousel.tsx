'use client'

import { isPopulated } from '@/lib/isPopulated'
import { pictureSrc } from '@/lib/picture'
import { summarizeTour } from '@/lib/tour-summary'
import { formatUnit } from '@/lib/duration'
import type { Tour } from '@/payload-types'
import { DepthSelect } from '@gfazioli/mantine-depth-select'
import { ActionIcon, AspectRatio, Group, Image, Stack, Title } from '@mantine/core'
import { ArrowRight, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import classes from './ToursCarousel.module.css'

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
  const single = tours.length < 2

  const select = (tourId: string | number) => {
    const found = tours.findIndex((tour) => tour.id === tourId)
    if (found !== -1) setIndex(found)
  }

  return (
    <Stack component="section" gap="md" className={classes.root}>
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        {/* h2: the deck is a section of its page (museum, profile), right
            under the h1; the pager counts the tours, so the title doesn't. */}
        <Title order={2} size="h5">
          {t('Tours')}
        </Title>
        <Link href={`/${lng}/search/tours` as Route} className={classes.seeAll}>
          <span className={classes.seeAllLabel}>{t('See all')}</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
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
            data={tours.map((tour) => ({
              value: tour.id,
              view: <TourCard tour={tour} lng={lng} />,
            }))}
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
      {!single && (
        <Group justify="center" gap={2} className={classes.pager}>
          <ActionIcon
            size="xl"
            radius="xl"
            variant="subtle"
            color="gray"
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
            size="xl"
            radius="xl"
            variant="subtle"
            color="gray"
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
 * One card of the deck: the cover (the tour colours with a pin mark without
 * one) under a plum scrim with the title and its figures, the gradient foot
 * line, and the "go" button that only the front card shows. Purely
 * presentational: it sits in a `role="option"`.
 */
const TourCard = ({ tour, lng }: { tour: Tour; lng: string }) => {
  const { t } = useTranslation('tours-carousel')
  const summary = summarizeTour(tour)
  const cover = isPopulated(tour.thumbnail) ? pictureSrc(tour.thumbnail, 'card') : null
  return (
    <div className={classes.card} data-cover={cover ? 'photo' : 'none'}>
      {cover ? (
        <Image src={cover} alt="" fit="cover" h="100%" w="100%" className={classes.cover} />
      ) : (
        <MapPin className={classes.mark} size={40} aria-hidden />
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
