import { describe, expect, it } from 'vitest'
import { orderStops } from '@/lib/tour-order'
import type { Room } from '@/lib/museum-rooms'

// Planned-tour order (src/lib/tour-order.ts): three rooms in a row, west to east.
const square = (id: string, x: number): Room => ({
  id,
  name: id,
  polygon: [
    [x, 0],
    [x + 10, 0],
    [x + 10, 10],
    [x, 10],
  ],
})
const rooms = [square('west', 0), square('middle', 10), square('east', 20)]

describe('orderStops', () => {
  it('finishes a room before moving to the closest next one', () => {
    const order = orderStops(
      [
        { id: 'east-1', point: [25, 5] },
        { id: 'west-far', point: [8, 5] },
        { id: 'middle-1', point: [15, 5] },
        { id: 'west-near', point: [2, 5] },
        { id: 'east-2', point: [21, 5] },
      ],
      rooms,
      [0, 5],
    )
    expect(order).toEqual(['west-near', 'west-far', 'middle-1', 'east-2', 'east-1'])
  })

  it('puts stops that are not on the map last, in their original order', () => {
    const order = orderStops(
      [
        { id: 'missing-a', point: null },
        { id: 'east', point: [25, 5] },
        { id: 'missing-b', point: null },
      ],
      rooms,
      null,
    )
    expect(order).toEqual(['east', 'missing-a', 'missing-b'])
  })
})
