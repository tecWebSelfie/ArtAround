import { getPayload, type Payload } from 'payload'
import { ItemNode, LevelNode } from '@pascal-app/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { createMuseumMap } from '@/mocks/museum.mock'
import { ExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { isPlacedEntrance, tourStartEntrance } from '@/lib/tour-entrance'
import { collectMuseumMarkers } from '@/lib/pascal/museum-plugin/markers-in-map'
import { museumRooms } from '@/lib/museum-rooms'
import { routeStart } from '@/lib/route-start'
import { requireMongoDB } from '../helpers/mongodb'

/**
 * The tour's start entrance (`tours.startEntrance`, src/lib/tour-entrance.ts):
 * the author's choice when it is a placed entrance of the museum map, else the
 * entrance nearest the first stop; the server refuses a choice that isn't
 * one; and navigation previews the route from it at the start of the tour.
 */

const suffix = Math.random().toString(36).slice(2, 8)

/** A map with a work at (10, 2), an entrance near it, one far, and one not placed. */
function museumMap(objectId: string) {
  const map = createMuseumMap(`se_${suffix}`, { width: 12, depth: 8, partitions: [] })
  const level = LevelNode.parse(
    Object.values(map.nodes).find((node) => LevelNode.safeParse(node).success),
  )
  const work = ItemNode.parse({
    parentId: level.id,
    position: [10, 0, 2],
    asset: {
      id: objectId,
      name: objectId,
      category: 'museum-objects',
      src: 'http://localhost:3000/models/Avatar.glb',
      thumbnail: '',
    },
  })
  const entrance = (name: string, position: [number, number, number], placed = true) =>
    ExitEntranceNode.parse({ name, direction: 'entrance', placed, position, parentId: level.id })
  const far = entrance('Main', [0, 0, 0])
  const near = entrance('Garden', [11, 0, 3])
  const unplaced = entrance('Planned', [10, 0, 2], false)
  const exit = ExitEntranceNode.parse({ direction: 'exit', placed: true, position: [10, 0, 2] })
  for (const node of [level, work, far, near, unplaced, exit]) map.nodes[node.id] = node
  return { map, far, near, unplaced, exit }
}

describe('tourStartEntrance', () => {
  const { map, far, near, unplaced, exit } = museumMap('work-1')
  const nodes = map.nodes as Record<string, unknown>
  // What the navigation page has already read from the map.
  const read = {
    exitEntrances: collectMuseumMarkers(nodes).exitEntrances,
    objects: museumRooms(nodes).objects,
  }

  it("keeps the author's choice", () => {
    expect(tourStartEntrance({ startEntrance: far.id, firstObjectId: 'work-1' }, read)).toBe(far.id)
  })

  it('defaults to the entrance nearest the first stop', () => {
    expect(tourStartEntrance({ firstObjectId: 'work-1' }, read)).toBe(near.id)
  })

  it('falls back to the nearest when the choice is no longer a placed entrance', () => {
    for (const stale of [unplaced.id, exit.id, 'removed-marker']) {
      expect(tourStartEntrance({ startEntrance: stale, firstObjectId: 'work-1' }, read)).toBe(
        near.id,
      )
    }
  })

  it('has none on a map without entrances', () => {
    expect(
      tourStartEntrance({ firstObjectId: 'work-1' }, { exitEntrances: [], objects: [] }),
    ).toBeNull()
  })

  it('accepts only placed entrances', () => {
    expect(isPlacedEntrance(near.id, nodes)).toBe(true)
    expect(isPlacedEntrance(unplaced.id, nodes)).toBe(false)
    expect(isPlacedEntrance(exit.id, nodes)).toBe(false)
  })
})

describe('routeStart with the tour entrance', () => {
  type P = [number, number]
  const distance = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const entrances = [
    { id: 'main', point: [0, 0] as P },
    { id: 'garden', point: [11, 3] as P },
  ]

  it('previews from the preferred entrance, though another is nearer, as a guess', () => {
    expect(
      routeStart({
        at: null,
        workPoint: null,
        entrances,
        end: [10, 2],
        distance,
        preferredEntranceId: 'main',
      }),
    ).toEqual({ start: [0, 0], confirmed: false })
  })

  it('never lets the preference override a confirmed position', () => {
    expect(
      routeStart({
        at: 'garden',
        workPoint: null,
        entrances,
        end: [10, 2],
        distance,
        preferredEntranceId: 'main',
      }),
    ).toEqual({ start: [11, 3], confirmed: true })
  })
})

describe('the server keeps startEntrance to a placed entrance', () => {
  let payload: Payload
  const created: {
    collection: 'tours' | 'museums' | 'objects' | 'contents' | 'users'
    id: string
  }[] = []
  let museumId: string
  // A tour needs two stops to be saved at all.
  const stops: string[] = []
  let entrances: ReturnType<typeof museumMap>

  beforeAll(async () => {
    await requireMongoDB()
    payload = await getPayload({ config: await config })
    const object = await payload.create({
      collection: 'objects',
      data: { name: `SE work ${suffix}` },
      context: { skipMintModelGeneration: true },
      overrideAccess: true,
    })
    created.push({ collection: 'objects', id: object.id })
    entrances = museumMap(object.id)
    const museum = await payload.create({
      collection: 'museums',
      data: {
        name: `SE museum ${suffix}`,
        accessibility: { isAccessible: false },
        shortDescription: 'Start entrance spec',
        ticketInfo: { label: 'free' },
        location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
        map: entrances.map,
      } as never,
      overrideAccess: true,
    })
    museumId = museum.id
    created.push({ collection: 'museums', id: museumId })
    const author = await payload.create({
      collection: 'users',
      data: {
        email: `se-${suffix}@example.com`,
        password: 'test-password',
        username: `se${suffix}`,
        name: { firstName: 'Start', lastName: 'Entrance', fullName: 'Start Entrance' },
      } as never,
      overrideAccess: true,
    })
    created.push({ collection: 'users', id: author.id })
    const body = {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'x' }] },
        ],
      },
    }
    for (const title of ['one', 'two']) {
      const content = await payload.create({
        collection: 'contents',
        data: {
          title: `SE ${title} ${suffix}`,
          difficulty: 'easy',
          body,
          author: author.id,
        } as never,
        overrideAccess: true,
      })
      created.push({ collection: 'contents', id: content.id })
      stops.push(content.id)
    }
  })

  afterAll(async () => {
    for (const { collection, id } of created.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true }).catch(() => {})
    }
  })

  const tourWith = (startEntrance: string) =>
    payload.create({
      collection: 'tours',
      data: {
        title: `SE tour ${suffix}`,
        museum: museumId,
        contents: stops,
        startEntrance,
      } as never,
      overrideAccess: true,
    })

  it('saves a placed entrance', async () => {
    const tour = await tourWith(entrances.far.id)
    created.push({ collection: 'tours', id: tour.id })
    expect(tour.startEntrance).toBe(entrances.far.id)
  })

  it('lets an unrelated edit through once the chosen entrance is gone', async () => {
    const tour = await tourWith(entrances.far.id)
    created.push({ collection: 'tours', id: tour.id })
    // Staff remove that entrance from the map: the tour still saves.
    const map = structuredClone(entrances.map)
    delete map.nodes[entrances.far.id]
    await payload.update({
      collection: 'museums',
      id: museumId,
      data: { map } as never,
      overrideAccess: true,
    })
    const renamed = await payload.update({
      collection: 'tours',
      id: tour.id,
      data: { title: `SE renamed ${suffix}`, startEntrance: entrances.far.id } as never,
      overrideAccess: true,
    })
    expect(renamed.title).toBe(`SE renamed ${suffix}`)
    await payload.update({
      collection: 'museums',
      id: museumId,
      data: { map: entrances.map } as never,
      overrideAccess: true,
    })
  })

  it('clears the entrance while moving the tour to another museum', async () => {
    const tour = await tourWith(entrances.far.id)
    created.push({ collection: 'tours', id: tour.id })
    const other = await payload.create({
      collection: 'museums',
      data: {
        name: `SE other museum ${suffix}`,
        accessibility: { isAccessible: false },
        shortDescription: 'Start entrance spec',
        ticketInfo: { label: 'free' },
        location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
      } as never,
      overrideAccess: true,
    })
    created.push({ collection: 'museums', id: other.id })
    // An explicit null is "automatic": the old museum's id is not checked
    // against the new museum's map.
    const moved = await payload.update({
      collection: 'tours',
      id: tour.id,
      data: { museum: other.id, startEntrance: null } as never,
      overrideAccess: true,
    })
    expect(moved.startEntrance ?? null).toBeNull()
  })

  it('refuses an exit, an unplaced marker or an unknown id', async () => {
    for (const id of [entrances.exit.id, entrances.unplaced.id, 'not-a-marker']) {
      await expect(tourWith(id)).rejects.toThrow(/start entrance/)
    }
  })
})
