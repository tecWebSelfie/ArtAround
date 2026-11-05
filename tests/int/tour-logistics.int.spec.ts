import { describe, expect, it } from 'vitest'
import {
  directionsByStop,
  keptDirections,
  logisticNotes,
  stopDirections,
} from '@/lib/tour-logistics'
import type { Tour } from '@/payload-types'

/**
 * Logistic directions of a tour (course specification: a visit is items plus
 * logistic directions, which are not items): the practical information comes
 * before the first stop, each stop's note travels with its content.
 */
const tour = {
  logistics: 'Entrance at Via delle Belle Arti 56; free cloakroom.',
  contents: ['c1', { id: 'c2' }, 'c3'],
  directions: [
    { content: 'c1', text: 'Room 6, first wall.' },
    { content: { id: 'c2' }, text: '  Next along the wall.  ' },
    { content: 'c3', text: '   ' },
  ],
} as unknown as Pick<Tour, 'logistics' | 'directions' | 'contents'>

describe('tour logistics', () => {
  it('gives the practical information before the first stop only', () => {
    expect(logisticNotes(tour, 0)).toEqual([
      'Entrance at Via delle Belle Arti 56; free cloakroom.',
      'Room 6, first wall.',
    ])
    expect(logisticNotes(tour, 1)).toEqual(['Next along the wall.'])
    // A blank note and the end of the tour have nothing to say.
    expect(logisticNotes(tour, 2)).toEqual([])
    expect(logisticNotes(tour, 3)).toEqual([])
  })

  it('finds a stop’s note by its content, populated or not', () => {
    expect(stopDirections(tour, 'c2')).toBe('Next along the wall.')
    expect(stopDirections(tour, 'missing')).toBeNull()
    expect(directionsByStop(tour)).toMatchObject({ c1: 'Room 6, first wall.' })
  })

  it('drops the notes of removed stops and empty notes on save', () => {
    expect(keptDirections(tour.directions, ['c2', 'c3'])).toEqual([
      { content: { id: 'c2' }, text: '  Next along the wall.  ' },
    ])
  })
})
