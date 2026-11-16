'use client'

/**
 * A museum's opening hours as the Info tab shows them: a status line that
 * answers "can I go now?" ("Open now · closes at 7:00 PM"), then the week
 * with today marked, then the museum's own notes.
 *
 * The status needs the current time, which a server-rendered (and cached)
 * page can't know, so it is computed in the browser only: the server and the
 * first client render show a placeholder of the same height, then the line
 * appears and keeps itself current every minute. "Now" is the museum's wall
 * clock (`museumClock` in its IANA zone), so a visitor abroad reads the same
 * status as one standing at the door. Without a zone (no saved position) the
 * week still marks today by the visitor's clock, and no status is claimed.
 *
 * Below `md` the week folds behind "Show the whole week" (status and today's
 * hours stay in view); from `md` it is always open.
 */
import {
  museumClock,
  openingStatus,
  timeOfDayFormatter,
  type MuseumClock,
} from '@/lib/opening-hours'
import type { Museum } from '@/payload-types'
import { Button, Group, Skeleton, Stack, Table, Text, ThemeIcon } from '@mantine/core'
import { ChevronDown, Clock, DoorClosed, DoorOpen } from 'lucide-react'
import { useId, useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

// The current minute as a store: one timer, re-rendering when the minute
// changes; `null` on the server and during hydration.
const MINUTE = 60_000
const subscribeToMinutes = (onChange: () => void) => {
  const timer = window.setInterval(onChange, MINUTE / 4)
  return () => window.clearInterval(timer)
}
const currentMinute = () => Math.floor(Date.now() / MINUTE)
const noMinute = () => null

export function OpeningHours({
  hours,
  rows,
  timeZone,
  lng,
}: {
  hours: Museum['openingHours']
  /** `openingHoursRows` of `hours`, formatted on the server. */
  rows: { day: string; ranges: string }[]
  /** The museum's IANA zone (`museumTimeZone`); null without a position. */
  timeZone: string | null
  lng: string
}) {
  const { t } = useTranslation('museum-page')
  const [weekOpen, setWeekOpen] = useState(false)
  const weekId = useId()
  const minute = useSyncExternalStore(subscribeToMinutes, currentMinute, noMinute)
  const clock =
    minute === null ? null : museumClock(new Date(minute * MINUTE), timeZone ?? undefined)
  const today = clock?.weekday ?? -1
  const notes = hours?.notes

  return (
    <Stack gap="sm">
      {timeZone && rows.length > 0 && (
        // A polite live region: the line changes on its own at opening and
        // closing time, while the page stays open.
        <div aria-live="polite">
          {clock ? (
            <StatusLine hours={hours} rows={rows} clock={clock} lng={lng} />
          ) : (
            <Skeleton height={28} width="16rem" radius="xl" />
          )}
        </div>
      )}
      {rows.length > 0 && (
        <>
          {/* Phones: today's hours stand in for the folded week. */}
          {!weekOpen && rows[today] && (
            <Text size="sm" className="tabular-nums from-md:hidden">
              <Text span inherit fw={600}>
                {t('Today')}
              </Text>
              {' · '}
              {rows[today].ranges || t('Closed')}
            </Text>
          )}
          <Table
            id={weekId}
            withRowBorders={false}
            verticalSpacing={4}
            horizontalSpacing={0}
            fz="sm"
            w="auto"
            className={weekOpen ? undefined : 'below-md:hidden'}
          >
            <Table.Caption className="sr-only">{t('Opening hours')}</Table.Caption>
            <Table.Tbody>
              {rows.map(({ day, ranges }, index) => {
                const isToday = index === today
                return (
                  <Table.Tr key={day} aria-current={isToday ? 'date' : undefined}>
                    <Table.Th
                      scope="row"
                      fw={isToday ? 700 : 400}
                      c={isToday ? undefined : 'dimmed'}
                      pe="xl"
                      className="whitespace-nowrap"
                    >
                      {day}
                      {isToday && (
                        <Text span inherit fw={400} c="dimmed">
                          {' · '}
                          {t('today')}
                        </Text>
                      )}
                    </Table.Th>
                    <Table.Td
                      fw={isToday ? 700 : 400}
                      c={ranges ? undefined : 'dimmed'}
                      className="tabular-nums"
                    >
                      {ranges || t('Closed')}
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
          <Button
            variant="subtle"
            size="sm"
            px={0}
            className="self-start from-md:hidden"
            aria-expanded={weekOpen}
            aria-controls={weekId}
            onClick={() => setWeekOpen((open) => !open)}
            rightSection={
              <ChevronDown
                size={16}
                aria-hidden
                className={`transition-transform duration-200 motion-reduce:transition-none ${weekOpen ? 'rotate-180' : ''}`}
              />
            }
          >
            {weekOpen ? t('Hide the week') : t('Show the whole week')}
          </Button>
          {/* Visitors abroad shouldn't convert them. */}
          <Text size="xs" c="dimmed">
            {t('Local time at the museum')}
          </Text>
        </>
      )}
      {notes && (
        <Text size="sm" c="dimmed">
          {notes}
        </Text>
      )}
    </Stack>
  )
}

/**
 * "Open now · closes at 7:00 PM", "Closes soon · at 7:00 PM", "Closed · opens
 * tomorrow at 9:00 AM": the state in words with its own icon, never color
 * alone (The Triplet Rule).
 */
function StatusLine({
  hours,
  rows,
  clock,
  lng,
}: {
  hours: Museum['openingHours']
  /** The week's rows: their day names are the ones this line says. */
  rows: { day: string }[]
  clock: MuseumClock
  lng: string
}) {
  const { t } = useTranslation('museum-page')
  // One formatter per language, not one per minute's re-render.
  const time = useMemo(() => timeOfDayFormatter(lng), [lng])
  const status = openingStatus(hours, clock)
  if (!status) return null

  let icon, color, label, detail
  if (status.open) {
    icon = status.closingSoon ? <Clock size={16} aria-hidden /> : <DoorOpen size={16} aria-hidden />
    color = status.closingSoon ? 'yellow' : 'green'
    label = status.closingSoon ? t('Closes soon') : t('Open now')
    detail = t('closes at {{time}}', { time: time(status.closes) })
  } else {
    icon = <DoorClosed size={16} aria-hidden />
    color = 'gray'
    label = t('Closed')
    const opens = status.opens
    detail = !opens
      ? null
      : opens.inDays === 0
        ? t('opens today at {{time}}', { time: time(opens.time) })
        : opens.inDays === 1
          ? t('opens tomorrow at {{time}}', { time: time(opens.time) })
          : t('opens {{day}} at {{time}}', {
              day: rows[(clock.weekday + opens.inDays) % 7].day,
              time: time(opens.time),
            })
  }

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <ThemeIcon variant="light" color={color} radius="xl" size={28}>
        {icon}
      </ThemeIcon>
      <Text size="sm">
        <Text span inherit fw={700}>
          {label}
        </Text>
        {detail && ` · ${detail}`}
      </Text>
    </Group>
  )
}
