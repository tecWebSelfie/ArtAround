import { describe, expect, it } from 'vitest'
import { MUSEUM, OBJECTS, TOURS } from '../../scripts/demo-museum-data'
import { PROJECT_ACCOUNTS, PROJECT_PASSWORD } from '@/seed-accounts'

/**
 * The seed data the course specification requires (requirement 1 of
 * `docs/plan/requisiti-18-33.md`): the four named accounts, a real museum
 * described with universal identifiers, and three tours of at least ten works
 * on it, one with the quiz used for the synchronised class visit. The data
 * is checked here; `pnpm seed:demo` writes it and checks the routes.
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
    expect(TOURS).toHaveLength(3)
    for (const tour of TOURS) {
      expect(tour.stops.every((title) => contentTitles.includes(title))).toBe(true)
      const works = new Set(tour.stops.map((title) => objectByContent.get(title)))
      expect(works.size, tour.title).toBeGreaterThanOrEqual(10)
    }
    expect(TOURS.filter(({ quiz }) => quiz.length > 0)).toHaveLength(1)
  })
})
