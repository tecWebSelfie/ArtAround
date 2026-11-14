import { describe, expect, it } from 'vitest'
import { copiedDirections, copyableStops } from '@/lib/tour-copy'

/**
 * What a copy of someone's tour (`/tour/new?from=`) starts with: only the
 * stops its visitor can keep and visit, with their directions.
 */
describe('copyableStops', () => {
  const contents = [
    { id: 'open', visibility: 'public', author: 'u2' },
    { id: 'theirs', visibility: 'private', author: 'u2' },
    { id: 'mine', visibility: 'private', author: 'u1' },
  ]
  const base = { contents, viewerId: 'u1' }

  it('keeps public and own private stops, in the original’s order', () => {
    expect(
      copyableStops({
        ...base,
        stopIds: ['mine', 'open'],
        candidateIds: new Set(['open', 'mine']),
      }),
    ).toEqual(['mine', 'open'])
  })

  it('drops another author’s private stops', () => {
    expect(
      copyableStops({
        ...base,
        stopIds: ['open', 'theirs'],
        candidateIds: new Set(['open', 'theirs']),
      }),
    ).toEqual(['open'])
  })

  it('drops unavailable (not a candidate) and unreadable (not read) stops', () => {
    expect(
      copyableStops({
        ...base,
        stopIds: ['gone', 'off-map', 'open', 'hidden'],
        // `off-map` is no candidate; `hidden` is a candidate the visitor couldn't read.
        candidateIds: new Set(['open', 'hidden']),
      }),
    ).toEqual(['open'])
  })

  it('can leave nothing', () => {
    expect(
      copyableStops({ ...base, stopIds: ['theirs'], candidateIds: new Set(['theirs']) }),
    ).toEqual([])
  })
})

describe('copiedDirections', () => {
  it('takes along only the directions of the kept stops', () => {
    const source = {
      directions: [
        { content: 'a', text: 'Left' },
        { content: 'b', text: 'Right' },
      ],
    }
    expect(copiedDirections(source as never, ['b'])).toEqual({ b: 'Right' })
  })
})
