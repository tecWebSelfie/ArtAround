import { describe, expect, it } from 'vitest'
import { openingHoursRows, TIME_OF_DAY } from '@/lib/opening-hours'

// Museum opening hours are the museum's wall clock (`HH:mm`): shown in the
// visitor's notation, never shifted by the visitor's or server's time zone.
describe('openingHoursRows', () => {
  const hours = {
    monday: [],
    tuesday: [
      { opening: '09:00', closing: '13:00' },
      { opening: '14:30', closing: '19:00' },
    ],
  }

  it('keeps the museum times, in the visitor’s notation', () => {
    expect(openingHoursRows(hours, 'it')[1]).toEqual({
      day: 'martedì',
      ranges: '09:00–13:00, 14:30–19:00',
    })
    expect(openingHoursRows(hours, 'en')[1].ranges).toBe('9:00 AM–1:00 PM, 2:30 PM–7:00 PM')
  })

  it('reads a day without ranges as closed and skips malformed times', () => {
    const rows = openingHoursRows(
      { ...hours, wednesday: [{ opening: '9', closing: '18:00' }] },
      'en',
    )
    expect(rows[0]).toMatchObject({ day: 'Monday', ranges: '' })
    expect(rows[2].ranges).toBe('')
  })

  it('shows nothing when the museum entered no hours', () => {
    expect(openingHoursRows({ monday: [] }, 'en')).toEqual([])
    expect(openingHoursRows(undefined, 'en')).toEqual([])
  })
})

describe('TIME_OF_DAY', () => {
  it('accepts 24-hour HH:mm only', () => {
    for (const ok of ['00:00', '09:30', '23:59']) expect(TIME_OF_DAY.test(ok)).toBe(true)
    for (const bad of ['9:30', '24:00', '12:60', '09:30:00', '2026-01-15T09:00:00.000Z'])
      expect(TIME_OF_DAY.test(bad)).toBe(false)
  })
})
