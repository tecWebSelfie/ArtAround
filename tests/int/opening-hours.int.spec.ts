import { describe, expect, it } from 'vitest'
import { museumClock, openingHoursRows, openingStatus, TIME_OF_DAY } from '@/lib/opening-hours'

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

// The Info tab's status line: open until when, or closed until which opening,
// by the museum's wall clock (weekday 0 = Monday).
describe('openingStatus', () => {
  const week = {
    monday: [],
    tuesday: [
      { opening: '14:30', closing: '19:00' },
      // Unsorted on purpose: the morning range comes first all the same.
      { opening: '09:00', closing: '13:00' },
    ],
    friday: [{ opening: '20:00', closing: '01:00' }],
  }
  const at = (weekday: number, time: string) => {
    const [h, m] = time.split(':').map(Number)
    return { weekday, minutes: h * 60 + m }
  }

  it('is open until the range closes, and says when that is soon', () => {
    expect(openingStatus(week, at(1, '10:00'))).toEqual({
      open: true,
      closes: '13:00',
      closingSoon: false,
    })
    expect(openingStatus(week, at(1, '18:15'))).toMatchObject({ open: true, closingSoon: true })
  })

  it('is closed until the next opening: later today, tomorrow or a later day', () => {
    expect(openingStatus(week, at(1, '13:30'))).toEqual({
      open: false,
      opens: { time: '14:30', inDays: 0 },
    })
    expect(openingStatus(week, at(0, '10:00'))).toEqual({
      open: false,
      opens: { time: '09:00', inDays: 1 },
    })
    expect(openingStatus(week, at(1, '19:00'))).toEqual({
      open: false,
      opens: { time: '20:00', inDays: 3 },
    })
  })

  it('keeps a late opening open past midnight', () => {
    expect(openingStatus(week, at(4, '23:30'))).toEqual({
      open: true,
      closes: '01:00',
      closingSoon: false,
    })
    expect(openingStatus(week, at(5, '00:30'))).toMatchObject({ open: true, closes: '01:00' })
    expect(openingStatus(week, at(5, '01:00'))).toMatchObject({ open: false })
  })

  it('claims nothing without hours', () => {
    expect(openingStatus({ monday: [] }, at(0, '10:00'))).toBeNull()
  })
})

describe('museumClock', () => {
  it('reads the museum’s wall clock, daylight saving included', () => {
    // 2026-07-06 is a Monday; 08:15 UTC is 10:15 in Rome (CEST).
    expect(museumClock(new Date('2026-07-06T08:15:00Z'), 'Europe/Rome')).toEqual({
      weekday: 0,
      minutes: 10 * 60 + 15,
    })
    // 23:30 UTC on that Monday is already Tuesday morning in Tokyo.
    expect(museumClock(new Date('2026-07-06T23:30:00Z'), 'Asia/Tokyo').weekday).toBe(1)
  })
})

describe('TIME_OF_DAY', () => {
  it('accepts 24-hour HH:mm only', () => {
    for (const ok of ['00:00', '09:30', '23:59']) expect(TIME_OF_DAY.test(ok)).toBe(true)
    for (const bad of ['9:30', '24:00', '12:60', '09:30:00', '2026-01-15T09:00:00.000Z'])
      expect(TIME_OF_DAY.test(bad)).toBe(false)
  })
})
