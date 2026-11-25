'use client'

import type { Tour } from '@/payload-types'
import { ActionIcon, AppShellHeader, Group, Progress, Stack, Text, Title } from '@mantine/core'
import { formatUnit } from '@/lib/duration'
import { roomAt, type MuseumRooms } from '@/lib/museum-rooms'
import { readingMinutes } from '@/lib/tour-summary'
import { tourHasQuiz as hasQuiz } from '@/lib/tour-navigation'
import { GroupBadge } from '@/components/group/GroupBadge'
import { X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { LogisticNotes } from './LogisticNotes'
import i18nConfig from '@/../i18n.config'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { TourProgress } from './TourProgress'

/**
 * The navigation's header. In a tour: its title (with the group badge), where
 * the visitor is in it, the way out, the progress and the author's notes for
 * the stop ahead. In free navigation: the museum's name.
 */
export function NavigationHeader({
  ref,
  tour,
  step,
  museumName,
  stopObjectId,
  rooms,
  entranceLabel,
  notes,
}: {
  ref: Ref<HTMLElement>
  tour: Tour | null
  step: number
  museumName: string
  /** The work of the stop ahead, for its room. */
  stopObjectId: string | null | undefined
  rooms: MuseumRooms
  /** The entrance the route starts from, while there is no confirmed position. */
  entranceLabel: string | undefined
  notes: string[]
}) {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  const position = useTourPosition(tour, step, rooms, stopObjectId)
  return (
    // Top padding (and the notch's inset): the title no longer touches the
    // screen's edge, which made the bar read cramped. A named region, not a
    // second page banner beside a dialog title.
    <AppShellHeader
      ref={ref}
      role="group"
      aria-label={t('Museum navigation')}
      px="xs"
      pb="xs"
      className="rounded-b-xl pt-[max(var(--mantine-spacing-xs),env(safe-area-inset-top))]"
    >
      {tour ? (
        // Desktop: one centred column (the brief's 1200px container) so the
        // progress bar and stepper don't stretch across a 1920px screen.
        <Stack gap="xs" maw={{ md: '75rem' }} mx={{ md: 'auto' }}>
          {/* In a group, the pill beside the title opens the group panel
            (GroupBadge). The trailing X leaves the tour for its page: the visit
            can be resumed from the same URL, so leaving needs no confirm. */}
          {/* Three columns, the outer two equal: the title stays centred on
            the screen whatever the X's size. */}
          <div className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-(--mantine-spacing-xs)">
            {/* Left column empty: the floating site logo sits there. */}
            <span aria-hidden />
            <Stack gap={0} align="center" className="min-w-0">
              <Group justify="center" gap="xs" wrap="nowrap">
                <Title size="h5" ta="center" lineClamp={1}>
                  {tour.title}
                </Title>
                <GroupBadge />
              </Group>
              {/* One line: a long room name or locale never wraps the
                  header taller (the stepper repeats the stop number). */}
              <Text size="xs" c="dimmed" ta="center" truncate="end" maw="100%">
                {position}
              </Text>
            </Stack>
            {/* The map's global commands, top right like a dashboard's: the
                language (the site header, which carries it elsewhere, is
                hidden over the map) and leaving the tour. */}
            <Group gap={6} wrap="nowrap" className="justify-self-end">
              <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
              <ActionIcon
                component={Link}
                href={`/${lng}/tour/${tour.id}` as Route}
                variant="subtle"
                color="gray"
                size="lg"
                aria-label={t('Leave the tour')}
              >
                <X size={18} aria-hidden />
              </ActionIcon>
            </Group>
          </div>
          {/* The bar and the stops are one thing (where the tour stands), so
              they sit close together, apart from the title above: two
              groups instead of four rows at the same distance. */}
          <Stack gap={4}>
            <Progress
              aria-label={t('Tour progress')}
              size="xs"
              value={tour.contents.length ? (step / tour.contents.length) * 100 : 100}
            />
            <TourProgress
              contents={tour.contents}
              step={step}
              entranceLabel={entranceLabel}
              hasQuiz={hasQuiz(tour)}
            />
          </Stack>
          <LogisticNotes notes={notes} />
        </Stack>
      ) : (
        // Free navigation: no progress to show, only where the visitor is.
        // Same three columns as a tour's header, the language at the end.
        <div className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-(--mantine-spacing-xs) pt-(--mantine-spacing-xs)">
          <span aria-hidden />
          <Stack gap={0} align="center" className="min-w-0">
            <Title size="h5" ta="center">
              {museumName}
            </Title>
            <Text size="xs" c="dimmed">
              {t('Free visit')}
            </Text>
          </Stack>
          <div className="justify-self-end">
            <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
          </div>
        </div>
      )}
    </AppShellHeader>
  )
}

// "Stop 3 of 14 · Room 6 · 25 min left": where the visitor is in the tour,
// where the next work hangs and how long the rest takes (the remaining
// stops' lengths, the only duration the data carries). Parts the data
// can't support are left out.
function useTourPosition(
  tour: Tour | null,
  step: number,
  rooms: MuseumRooms,
  stopObjectId: string | null | undefined,
) {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  return useMemo(() => {
    if (!tour) return ''
    if (step >= tour.contents.length)
      return t('All {{count}} stops visited', { count: tour.contents.length })
    const point = rooms.objects.find(({ objectId }) => objectId === stopObjectId)?.point
    const room = point ? roomAt(rooms.rooms, point)?.name : null
    const minutesLeft = readingMinutes(tour.contents.slice(step))
    return [
      t('Stop {{number}} of {{count}}', { number: step + 1, count: tour.contents.length }),
      room,
      minutesLeft
        ? t('{{duration}} of reading left', {
            duration: formatUnit(minutesLeft, 'minute', lng),
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [tour, step, rooms, stopObjectId, t, lng])
}
