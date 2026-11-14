import { describe, expect, it } from 'vitest'
import { MIN_TOUR_STOPS, minStopsFor } from '@/lib/tour-stops'

// The stop minimum the tour editor and the `tours` collection share
// (`src/lib/tour-stops.ts`): composed tours need two, personal ones one.
describe('minStopsFor', () => {
  it('asks a composed tour for MIN_TOUR_STOPS stops', () => {
    expect(MIN_TOUR_STOPS).toBe(2)
    expect(minStopsFor({})).toBe(2)
    expect(minStopsFor({ generation: { generated: false }, visitCopyOf: null })).toBe(2)
  })

  it('lets a planned visit keep a single stop', () => {
    expect(minStopsFor({ generation: { generated: true } })).toBe(1)
  })

  it('lets a visit copy keep a single stop', () => {
    expect(minStopsFor({ visitCopyOf: 'tour-1' })).toBe(1)
  })
})
