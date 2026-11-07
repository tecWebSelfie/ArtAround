import { describe, expect, it } from 'vitest'
import { nearbyWorks } from '@/lib/proximity-works'

// The visitor sees only nearby, facing works; an existing suggestion survives
// small GPS/heading fluctuations, but never follows them across the museum.
const works = [
  { id: 'north', point: [0, -2] as [number, number] },
  { id: 'east', point: [2, 0] as [number, number] },
]
describe('proximity suggestions while walking', () => {
  it('requires a usable position and narrows works by compass', () => {
    expect(nearbyWorks(null, 0, works, [])).toEqual([])
    expect(nearbyWorks([0, 0], 0, works, [])).toEqual(['north'])
    expect(nearbyWorks([0, 0], null, works, [])).toEqual(['north', 'east'])
  })
  it('retains an existing work through small range fluctuations, then removes it', () => {
    expect(nearbyWorks([0, 1.5], 0, works, [])).toEqual([])
    expect(nearbyWorks([0, 1.5], 0, works, ['north'])).toEqual(['north'])
    expect(nearbyWorks([0, 3], 0, works, ['north'])).toEqual([])
  })
  it('tolerates small turns without retaining works behind the visitor', () => {
    expect(nearbyWorks([0, 0], 35, works, ['north'])).toEqual(['north'])
    expect(nearbyWorks([0, 0], 90, works, ['north'])).toEqual(['east'])
  })
  it('deduplicates placed instances and never shows more than four choices', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      point: [0, -2] as [number, number],
    }))
    expect(nearbyWorks([0, 0], null, [many[0]!, ...many], [])).toEqual(['0', '1', '2', '3'])
  })
})
