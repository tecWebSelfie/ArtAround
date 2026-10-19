import { describe, expect, it } from 'vitest'
import { createRealisticMuseumMap } from '@/mocks/museum-map.mock'
import { museumRooms } from '@/lib/museum-rooms'
import { buildDirections, stepAtDistance, turnBetween } from '@/lib/tour-directions'
import { distanceAlongPath, estimatePlanPoint, gpsOffsetMetres, moveFix } from '@/lib/gps'
import { nearbySuggestions } from '@/lib/nearby-suggestions'

// Route guidance on the realistic fixture museum (src/mocks/museum-map.mock.ts):
// foyer (z 0–6) → distribution gallery (z 6–9) → archaeology (x 0–11, z 9–16).
const map = museumRooms(createRealisticMuseumMap('guidance').nodes)
const foyerToArchaeology: [number, number, number][] = [
  [15, 0, 3],
  [15, 0, 7.5],
  [5.5, 0, 7.5],
  [5.5, 0, 12],
]

describe('museumRooms', () => {
  it('reads rooms and places doors along their host wall', () => {
    expect(map.rooms.map((room) => room.name)).toContain('Archeologia')
    expect(map.doors.find((door) => door.name === 'Accesso alle collezioni')?.point).toEqual([15, 6])
  })
})

describe('turnBetween', () => {
  it('reads turns as seen by someone walking (plan z grows southwards)', () => {
    // Walking north (−z) and turning west (−x) is a left turn.
    expect(turnBetween([0, -1], [-1, 0])).toBe('left')
    expect(turnBetween([0, -1], [1, 0])).toBe('right')
    expect(turnBetween([0, -1], [0.1, -1])).toBe('straight')
  })
})

describe('buildDirections', () => {
  it('names rooms, doors, turns and the arrival side', () => {
    const steps = buildDirections(foyerToArchaeology, map, [6.5, 12])
    expect(steps).toMatchObject([
      { kind: 'start', room: 'Foyer e biglietteria' },
      { kind: 'enter', room: 'Galleria di distribuzione', door: 'Accesso alle collezioni', turn: 'right' },
      { kind: 'enter', room: 'Archeologia', door: 'Ingresso archeologia', turn: 'left' },
      { kind: 'arrive', side: 'left' },
    ])
  })

  it('still gives a start and an arrival on maps without rooms', () => {
    const steps = buildDirections(foyerToArchaeology, { rooms: [], doors: [], objects: [] })
    expect(steps.map((step) => step.kind)).toEqual(['start', 'arrive'])
  })

  it('picks the step by distance walked', () => {
    const steps = buildDirections(foyerToArchaeology, map)
    expect(stepAtDistance(steps, 0)).toBe(0)
    expect(stepAtDistance(steps, 5)).toBe(1)
    expect(stepAtDistance(steps, 100)).toBe(steps.length - 1)
  })
})

describe('gps', () => {
  const origin = { latitude: 45.4642, longitude: 9.19, accuracy: 4 }

  it('converts a fix moved 3 m east and 4 m north back into that offset', () => {
    const offset = gpsOffsetMetres(origin, moveFix(origin, 3, 4))
    expect(offset.east).toBeCloseTo(3, 5)
    expect(offset.north).toBeCloseTo(4, 5)
  })

  it('moves north towards −z on the plan and snaps onto the route', () => {
    expect(estimatePlanPoint([15, 3], { east: 0, north: 2 })).toEqual([15, 1])
    const along = distanceAlongPath(
      [
        [15, 3],
        [15, 7.5],
        [5.5, 7.5],
      ],
      [12, 8],
    )
    expect(along.point).toEqual([12, 7.5])
    expect(along.distance).toBeCloseTo(4.5 + 3)
  })
})

describe('nearbySuggestions', () => {
  const withObjects = {
    ...map,
    objects: [
      { objectId: 'amphora', point: [3, 12] as [number, number] },
      { objectId: 'painting', point: [24, 12] as [number, number] },
    ],
  }
  const catalog = [
    {
      id: 'amphora',
      name: 'Amphora',
      contents: [
        { id: 'tour-stop', title: 'On the tour' },
        { id: 'paid', title: 'Workshop secrets', price: 450, locked: true },
      ],
    },
    { id: 'painting', name: 'Painting', contents: [{ id: 'other-room', title: 'Elsewhere' }] },
  ]

  it('suggests off-tour contents of objects in the same room, paid ones included', () => {
    const result = nearbySuggestions({
      map: withObjects,
      point: [5, 13],
      catalog,
      tourContentIds: new Set(['tour-stop']),
      alreadySuggested: new Set(),
    })
    expect(result.room).toBe('Archeologia')
    expect(result.suggestions.map(({ content }) => content.id)).toEqual(['paid'])
    expect(result.suggestions[0].content.locked).toBe(true)
  })

  it('does not repeat a suggestion', () => {
    const result = nearbySuggestions({
      map: withObjects,
      point: [5, 13],
      catalog,
      tourContentIds: new Set(['tour-stop']),
      alreadySuggested: new Set(['paid']),
    })
    expect(result.suggestions).toEqual([])
  })
})
