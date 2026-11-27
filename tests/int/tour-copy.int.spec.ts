import { describe, expect, it } from 'vitest'
import { tourCopyPath } from '@/lib/tour-routes'
import {
  anonymousCopyStops,
  copiedDirections,
  copyableStops,
  reorderedDirections,
} from '@/lib/tour-copy'

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

/** An anonymous copy keeps exactly the requested stops, all offered, none repeated. */
describe('anonymousCopyStops', () => {
  const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'gone', unavailable: true }]

  it('keeps the requested order when every stop was offered', () => {
    expect(anonymousCopyStops(['b', 'a'], candidates)).toEqual(['b', 'a'])
  })

  it('refuses unknown, unavailable, repeated or no stops', () => {
    expect(anonymousCopyStops(['a', 'x'], candidates)).toBeNull()
    expect(anonymousCopyStops(['gone'], candidates)).toBeNull()
    expect(anonymousCopyStops(['a', 'a'], candidates)).toBeNull()
    expect(anonymousCopyStops([], candidates)).toBeNull()
  })
})

/** Customizing a planned visit keeps the visitor's navigation choices. */
describe('tourCopyPath', () => {
  it('carries the navigation choices to the editor, after its own params', () => {
    expect(tourCopyPath('en', 't1')).toBe('/en/tour/new?from=t1')
    expect(tourCopyPath('en', 't1', { visit: true, navigation: 'mobility=wheelchair&age=8' })).toBe(
      '/en/tour/new?from=t1&visit=1&mobility=wheelchair&age=8',
    )
  })
})

/**
 * An anonymous copy can reorder stops but can't see or edit directions: a
 * note says how to reach a stop from the one before it, so it only survives
 * when that predecessor (or the entrance, for the first) is unchanged.
 */
describe('reorderedDirections', () => {
  const directions = { a: 'From the entrance', b: 'Left of a', c: 'Through the arch from b' }

  it('keeps every note when the order is unchanged, dropping removed stops', () => {
    expect(reorderedDirections(['a', 'b', 'c'], ['a', 'b', 'c'], directions)).toEqual(directions)
    expect(reorderedDirections(['a', 'b', 'c'], ['a', 'b'], directions)).toEqual({
      a: 'From the entrance',
      b: 'Left of a',
    })
  })

  it('drops a note whose previous stop changed', () => {
    // b now comes first: "Left of a" would send the visitor the wrong way.
    expect(reorderedDirections(['a', 'b', 'c'], ['b', 'a', 'c'], directions)).toEqual({})
    // a removed: b is now reached from the entrance, c still from b.
    expect(reorderedDirections(['a', 'b', 'c'], ['b', 'c'], directions)).toEqual({
      c: 'Through the arch from b',
    })
  })
})
