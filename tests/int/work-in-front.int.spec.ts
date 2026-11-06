import { describe, expect, it } from 'vitest'
import { workInFront } from '@/lib/work-in-front'

/**
 * Advanced localization (course brief, Navigator 18-33): "the app uses the
 * device's positioning, orientation included, and decides which object the
 * user is standing in front of. If it is not sure, it shows a low-resolution
 * image of the possible objects and the user picks the right one."
 *
 * The seam is the decision rule `workInFront(position, heading, works)`:
 * a point on the north-up museum plan (north is −z, east is +x, as in
 * `src/lib/gps.ts`), the compass heading in degrees (0 = north, 90 = east;
 * null when the device has no compass), and the placed works. It answers
 * `sure` with one work, `choose` with the candidates to show, or `none`.
 */
const works = [
  { id: 'north', point: [0, -2] as [number, number] },
  { id: 'east', point: [2, 0] as [number, number] },
  { id: 'south', point: [0, 2] as [number, number] },
  { id: 'far-north', point: [0, -30] as [number, number] },
]

describe('the work the visitor is facing', () => {
  it('is the near work in the direction the device points', () => {
    expect(workInFront([0, 0], 0, works)).toEqual({ kind: 'sure', id: 'north' })
    expect(workInFront([0, 0], 90, works)).toEqual({ kind: 'sure', id: 'east' })
    expect(workInFront([0, 0], 180, works)).toEqual({ kind: 'sure', id: 'south' })
  })

  it('reads headings past a full turn and negative ones', () => {
    expect(workInFront([0, 0], 450, works)).toEqual({ kind: 'sure', id: 'east' })
    expect(workInFront([0, 0], -270, works)).toEqual({ kind: 'sure', id: 'east' })
  })

  it('ignores works too far away to be the one in front', () => {
    expect(workInFront([0, -25], 0, works)).toEqual({ kind: 'none' })
  })

  it('finds nothing when the device points at an empty wall', () => {
    expect(workInFront([0, 0], 270, works)).toEqual({ kind: 'none' })
  })

  it('asks the visitor to choose when two works hang side by side ahead', () => {
    const pair = [
      { id: 'left', point: [-0.4, -2] as [number, number] },
      { id: 'right', point: [0.4, -2] as [number, number] },
    ]

    expect(workInFront([0, 0], 0, pair)).toEqual({ kind: 'choose', ids: ['left', 'right'] })
  })

  it('without a compass, is sure only of a lone nearby work, else offers the nearby ones, nearest first', () => {
    expect(workInFront([2, -1], null, works)).toEqual({ kind: 'choose', ids: ['east', 'north'] })
    expect(workInFront([0, -29], null, works)).toEqual({ kind: 'sure', id: 'far-north' })
  })

  it('offers at most four candidates', () => {
    const wall = Array.from({ length: 7 }, (_, i) => ({
      id: `w${i}`,
      point: [(i - 3) * 0.3, -2] as [number, number],
    }))

    const result = workInFront([0, 0], 0, wall)

    expect(result.kind).toBe('choose')
    expect(result.kind === 'choose' && result.ids).toEqual(['w3', 'w2', 'w4', 'w1'])
  })
})
