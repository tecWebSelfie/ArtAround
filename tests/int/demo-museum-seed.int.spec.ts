import { describe, expect, it } from 'vitest'
import { MUSEUM, OBJECTS, TOURS } from '../../scripts/demo-museum-data'
import { PROJECT_ACCOUNTS, PROJECT_PASSWORD } from '@/seed-accounts'

/**
 * The seed data the course specification requires (requirement 1 of
 * `docs/plan/requisiti-18-33.md`): the four named accounts, a real museum
 * described with universal identifiers, and three tours of at least ten works
 * on it (plus a family tour), differing in level, with several items for some
 * works and logistic directions, one with the quiz used for the synchronised
 * class visit. The data is checked here; `pnpm seed:demo` writes it and
 * checks the routes.
 */
describe('project accounts', () => {
  it('are the four accounts the specification names, all with password 12345678', () => {
    expect(PROJECT_ACCOUNTS.map(({ username }) => username)).toEqual([
      'autore1',
      'autore2',
      'visitatore1',
      'visitatore2',
    ])
    expect(PROJECT_PASSWORD).toBe('12345678')
    expect(PROJECT_ACCOUNTS.every(({ password }) => password === PROJECT_PASSWORD)).toBe(true)
  })
})

describe('demo museum', () => {
  const contentTitles = OBJECTS.flatMap((object) => object.contents.map(({ title }) => title))
  const objectByContent = new Map(
    OBJECTS.flatMap((object) => object.contents.map(({ title }) => [title, object.key] as const)),
  )

  it('is a real museum identified on Wikidata', () => {
    expect(MUSEUM.name).toBe('Pinacoteca Nazionale di Bologna')
    expect(MUSEUM.wikidataId).toMatch(/^Q\d+$/)
  })

  it('gives every work a unique Wikidata id, a photo and a free spot on the map', () => {
    expect(OBJECTS.length).toBeGreaterThanOrEqual(10)
    const ids = OBJECTS.map(({ wikidataId }) => wikidataId)
    expect(ids.every((id) => /^Q\d+$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(OBJECTS.every(({ image }) => image.length > 0)).toBe(true)
    const spots = OBJECTS.map(({ position }) => position.join(','))
    expect(new Set(spots).size).toBe(spots.length)
  })

  it('writes every content as one of the two author accounts', () => {
    const authors = new Set(OBJECTS.flatMap((o) => o.contents.map(({ author }) => author)))
    expect([...authors].sort()).toEqual(['autore1', 'autore2'])
    expect(new Set(contentTitles).size).toBe(contentTitles.length)
  })

  it('has three tours of at least ten distinct works, one with a quiz', () => {
    const large = TOURS.filter(
      (tour) => new Set(tour.stops.map((t) => objectByContent.get(t))).size >= 10,
    )
    expect(large.length).toBeGreaterThanOrEqual(3)
    for (const tour of TOURS) {
      expect(
        tour.stops.every((title) => contentTitles.includes(title)),
        tour.title,
      ).toBe(true)
    }
    expect(TOURS.filter(({ quiz }) => quiz.length > 0)).toHaveLength(1)
  })

  it('differs by level and gives several items to some works in every tour', () => {
    const difficulty = new Map(
      OBJECTS.flatMap((object) => object.contents.map((c) => [c.title, c.difficulty] as const)),
    )
    // The most common level of each tour: not the same for all of them.
    const levels = TOURS.map((tour) => {
      const count = { easy: 0, medium: 0, hard: 0 }
      for (const title of tour.stops) count[difficulty.get(title)!]++
      return (Object.keys(count) as (keyof typeof count)[]).reduce((a, b) =>
        count[a] >= count[b] ? a : b,
      )
    })
    expect(new Set(levels).size).toBeGreaterThanOrEqual(3)
    for (const tour of TOURS) {
      const works = tour.stops.map((title) => objectByContent.get(title))
      expect(new Set(works).size, tour.title).toBeLessThan(works.length)
    }
  })

  it('gives every tour its logistic directions, only for its own stops', () => {
    for (const tour of TOURS) {
      expect(tour.logistics, tour.title).toBeTruthy()
      for (const title of Object.keys(tour.directions)) {
        expect(tour.stops, tour.title).toContain(title)
      }
    }
  })
})
