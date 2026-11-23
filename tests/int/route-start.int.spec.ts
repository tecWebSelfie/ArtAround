import { describe, expect, it } from 'vitest'
import { routeStart } from '@/lib/route-start'

/**
 * Regression specs for the map's route start (src/lib/route-start.ts). The
 * map used to draw "You" at an entrance it had only guessed, even in a free
 * visit with no destination, while the directions strip asked "Where are
 * you?": the scene asserted a position the visitor never gave.
 */

type P = [number, number]
const distance = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1])
const entrances = [
  { id: 'entrance-north', point: [0, 0] as P },
  { id: 'entrance-south', point: [0, 50] as P },
]

describe('routeStart', () => {
  it('guesses nothing in a free visit with no position and no destination', () => {
    expect(routeStart({ at: null, workPoint: null, entrances, end: null, distance })).toEqual({
      start: null,
      confirmed: false,
      entranceId: null,
    })
  })

  it('previews a route from the entrance nearest the destination, as a guess', () => {
    expect(routeStart({ at: null, workPoint: null, entrances, end: [2, 45], distance })).toEqual({
      start: [0, 50],
      confirmed: false,
      entranceId: 'entrance-south',
    })
  })

  it('starts from the entrance the visitor confirmed, even when another is nearer', () => {
    expect(
      routeStart({ at: 'entrance-north', workPoint: null, entrances, end: [2, 45], distance }),
    ).toEqual({ start: [0, 0], confirmed: true, entranceId: 'entrance-north' })
  })

  it('starts from the confirmed work', () => {
    expect(
      routeStart({ at: 'work-1', workPoint: [10, 10], entrances, end: [2, 45], distance }),
    ).toEqual({ start: [10, 10], confirmed: true, entranceId: null })
  })

  it('treats an `at` naming nothing on the map as no position', () => {
    expect(
      routeStart({ at: 'removed-work', workPoint: null, entrances, end: [0, 5], distance }),
    ).toEqual({ start: [0, 0], confirmed: false, entranceId: 'entrance-north' })
  })

  it('skips an entrance whose point cannot be resolved', () => {
    const unresolved = [{ id: 'entrance-north', point: null }, entrances[1]]
    expect(
      routeStart({
        at: 'entrance-north',
        workPoint: null,
        entrances: unresolved,
        end: [0, 5],
        distance,
      }),
    ).toEqual({ start: [0, 50], confirmed: false, entranceId: 'entrance-south' })
  })
})
