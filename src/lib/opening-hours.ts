import type { Museum } from '@/payload-types'

/**
 * Museum opening hours (src/fields/OpeningHours.ts) as the museum page shows
 * them. Times are the museum's wall clock, stored as `HH:mm`.
 */

/** `HH:mm`, 00:00 to 23:59. */
export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

/** The days of `openingHours`, in display order. */
export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

/**
 * The week's opening hours as rows ("Monday", "9:00 AM–1:00 PM, 2:00–7:00 PM"),
 * day names and times in the visitor's language; a day without ranges reads
 * as closed. No rows at all when the museum entered no hours, so nothing is
 * guessed.
 *
 * The times are the museum's wall clock (`HH:mm`, src/fields/OpeningHours.ts)
 * and stay so: they are formatted in UTC on a fixed day only to get the
 * locale's notation, never converted to the visitor's or the server's zone.
 */
export function openingHoursRows(hours: Museum['openingHours'], lng: string) {
  if (!hasOpeningHours(hours)) return []
  const dayName = weekdayNames(lng)
  const time = timeOfDayFormatter(lng)
  return WEEKDAYS.map((day, index) => ({
    day: dayName[index],
    ranges: (hours[day] ?? [])
      .map((range) => [time(range.opening), time(range.closing)])
      .filter(([opening, closing]) => opening && closing)
      .map(([opening, closing]) => `${opening}–${closing}`)
      .join(', '),
  }))
}

/** Whether the museum entered any range at all (else nothing about hours is shown). */
export function hasOpeningHours(
  hours: Museum['openingHours'],
): hours is NonNullable<Museum['openingHours']> {
  return Boolean(hours && WEEKDAYS.some((day) => hours[day]?.length))
}

/** The week's day names in the visitor's language, Monday first (as `WEEKDAYS`). */
export function weekdayNames(lng: string) {
  const dayName = new Intl.DateTimeFormat(lng, { weekday: 'long', timeZone: 'UTC' })
  // 1 January 2024 was a Monday.
  return WEEKDAYS.map((_, index) => dayName.format(new Date(Date.UTC(2024, 0, 1 + index))))
}

/**
 * A museum `HH:mm` in the visitor's notation ("09:00", "9:00 AM"); null for a
 * malformed value. Formatted in UTC on a fixed day only to get the locale's
 * notation: the time itself is never converted.
 */
export function timeOfDayFormatter(lng: string) {
  const timeFormat = new Intl.DateTimeFormat(lng, { timeStyle: 'short', timeZone: 'UTC' })
  return (value: string | null | undefined) => {
    const minutes = toMinutes(value)
    return minutes === null ? null : timeFormat.format(new Date(Date.UTC(1970, 0, 1, 0, minutes)))
  }
}

/** Minutes since midnight of an `HH:mm`, null when malformed. */
function toMinutes(value: string | null | undefined) {
  if (!value || !TIME_OF_DAY.test(value)) return null
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

/** `HH:mm` of minutes since midnight. */
const toTimeOfDay = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * The clock on the museum's wall at `now`: the weekday (0 = Monday, as
 * `WEEKDAYS`) and the minutes since midnight in the museum's time zone, so a
 * visitor abroad (or a server in UTC) gets the museum's "now", daylight
 * saving included. Without a zone it is the runtime's own clock.
 */
export function museumClock(now: Date, timeZone?: string) {
  const format = clockFormat(timeZone)
  // A zone this browser's time-zone data doesn't know (an id newer than the
  // runtime): weekday -1, so no status is claimed rather than crashing.
  if (!format) return { weekday: -1, minutes: 0 }
  const parts = format.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return {
    weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(part('weekday')),
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  }
}

export type MuseumClock = ReturnType<typeof museumClock>

// One zone-aware formatter per zone (the costly kind: it loads the zone's
// data), built on first use: the status line asks every minute.
const clockFormats = new Map<string, Intl.DateTimeFormat | null>()
function clockFormat(timeZone?: string) {
  const key = timeZone ?? ''
  if (!clockFormats.has(key)) {
    let format: Intl.DateTimeFormat | null
    try {
      format = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone,
      })
    } catch {
      format = null
    }
    clockFormats.set(key, format)
  }
  return clockFormats.get(key) ?? null
}

/**
 * Whether the museum is open at its wall-clock `clock`, as the Info tab's
 * status line says it: open until when (and whether that is within
 * `soonMinutes`), or closed until which opening (`inDays` 0 = later today,
 * 1 = tomorrow, …). Times are `HH:mm`, for `timeOfDayFormatter`.
 *
 * A range whose closing is not after its opening runs past midnight (a
 * 20:00–01:00 late opening), so it still counts in the small hours of the
 * next day. Null when the museum entered no hours: nothing is guessed.
 */
export function openingStatus(
  hours: Museum['openingHours'],
  clock: MuseumClock,
  soonMinutes = 60,
):
  | { open: true; closes: string; closingSoon: boolean }
  | { open: false; opens: { time: string; inDays: number } | null }
  | null {
  if (!hasOpeningHours(hours) || clock.weekday < 0) return null
  const current = currentRange(hours, clock)
  if (current) {
    const minutesLeft = current.ends - clock.minutes
    return {
      open: true,
      closes: toTimeOfDay(current.closing),
      closingSoon: minutesLeft <= soonMinutes,
    }
  }
  return { open: false, opens: nextOpening(hours, clock) }
}

type Range = { opening: number; closing: number }

/** A weekday's valid ranges in minutes, by opening (`weekday` wraps past Sunday). */
function rangesOf(hours: NonNullable<Museum['openingHours']>, weekday: number): Range[] {
  return (hours[WEEKDAYS[weekday % 7]] ?? [])
    .map((range) => ({ opening: toMinutes(range.opening), closing: toMinutes(range.closing) }))
    .filter(
      (range): range is Range =>
        range.opening !== null && range.closing !== null && range.opening !== range.closing,
    )
    .sort((a, b) => a.opening - b.opening)
}

/**
 * The range the museum is open in at `clock`, with when it ends in today's
 * minutes (past 24:00 for a range that runs over midnight); null when closed.
 * Yesterday's late opening counts in the small hours.
 */
function currentRange(hours: NonNullable<Museum['openingHours']>, clock: MuseumClock) {
  const now = clock.minutes
  const lateYesterday = rangesOf(hours, clock.weekday + 6).find(
    (range) => range.closing < range.opening && now < range.closing,
  )
  if (lateYesterday) return { closing: lateYesterday.closing, ends: lateYesterday.closing }
  const today = rangesOf(hours, clock.weekday).find((range) => {
    const overnight = range.closing < range.opening
    return now >= range.opening && (overnight || now < range.closing)
  })
  if (!today) return null
  const overnight = today.closing < today.opening
  return { closing: today.closing, ends: overnight ? today.closing + 24 * 60 : today.closing }
}

/** The next opening after `clock`: later today, or the first of the next days. */
function nextOpening(hours: NonNullable<Museum['openingHours']>, clock: MuseumClock) {
  const later = rangesOf(hours, clock.weekday).find((range) => range.opening > clock.minutes)
  if (later) return { time: toTimeOfDay(later.opening), inDays: 0 }
  for (let inDays = 1; inDays <= 7; inDays++) {
    const [first] = rangesOf(hours, clock.weekday + inDays)
    if (first) return { time: toTimeOfDay(first.opening), inDays }
  }
  return null
}
