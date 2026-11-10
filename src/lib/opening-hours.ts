import type { Museum } from '@/payload-types'

/**
 * Museum opening hours (src/fields/OpeningHours.ts) as the museum page shows
 * them. Times are the museum's wall clock, stored as `HH:mm`.
 */

/** `HH:mm`, 00:00 to 23:59. */
export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

const WEEKDAYS = [
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
  if (!hours || WEEKDAYS.every((day) => !hours[day]?.length)) return []
  const dayName = new Intl.DateTimeFormat(lng, { weekday: 'long', timeZone: 'UTC' })
  const timeFormat = new Intl.DateTimeFormat(lng, { timeStyle: 'short', timeZone: 'UTC' })
  const time = (value: string | null | undefined) => {
    if (!value || !TIME_OF_DAY.test(value)) return null
    const [h, m] = value.split(':').map(Number)
    return timeFormat.format(new Date(Date.UTC(1970, 0, 1, h, m)))
  }
  return WEEKDAYS.map((day, index) => ({
    // 1 January 2024 was a Monday.
    day: dayName.format(new Date(Date.UTC(2024, 0, 1 + index))),
    ranges: (hours[day] ?? [])
      .map((range) => [time(range.opening), time(range.closing)])
      .filter(([opening, closing]) => opening && closing)
      .map(([opening, closing]) => `${opening}–${closing}`)
      .join(', '),
  }))
}
