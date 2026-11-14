import { getPayload, type Payload } from 'payload'
import { ItemNode, LevelNode } from '@pascal-app/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import { createMuseumMap } from '@/mocks/museum.mock'
import { isEmptyTour } from '@/lib/tour-stops'
import { LISTED_TOURS } from '@/lib/visibility'
import { withVisitableStops, summarizeTour } from '@/lib/tour-summary'
import type { Tour } from '@/payload-types'
import { requireMongoDB } from '../helpers/mongodb'

/**
 * The stored visitable stops of a tour (`visitableStops`, `visitableContents`,
 * src/lib/visitable-stops.ts): a stop is visitable when its content is
 * readable (public, or the tour author's own) and about an object placed on
 * the museum's map. Real MongoDB through the Local API: the recompute runs in
 * the hooks of tours, museums, objects and contents, which is what is tested.
 */
let payload: Payload
const suffix = Math.random().toString(36).slice(2, 8)
const created: {
  collection: 'tours' | 'contents' | 'objects' | 'museums' | 'users'
  id: string
}[] = []

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
} as never

async function make<C extends (typeof created)[number]['collection']>(
  collection: C,
  data: Record<string, unknown>,
) {
  const doc = await payload.create({
    collection,
    data: data as never,
    locale: 'en',
    context: { skipMintModelGeneration: true },
    overrideAccess: true,
  } as never)
  created.push({ collection, id: String((doc as { id: string }).id) })
  return doc as unknown as { id: string }
}

/** A museum map placing `objectIds`, as the editor saves it. */
function mapWith(objectIds: string[]) {
  const map = createMuseumMap(`vs_${suffix}`, { width: 12, depth: 8, partitions: [] })
  const level = LevelNode.parse(
    Object.values(map.nodes).find((node) => LevelNode.safeParse(node).success),
  )
  const items = objectIds.map((id, index) =>
    ItemNode.parse({
      parentId: level.id,
      position: [2 + index, 0, 2],
      asset: {
        id,
        name: id,
        category: 'museum-objects',
        src: 'http://localhost:3000/models/Avatar.glb',
        thumbnail: '',
      },
    }),
  )
  map.nodes[level.id] = level
  for (const item of items) map.nodes[item.id] = item
  level.children = [...(level.children ?? []), ...items.map(({ id }) => id)]
  return map
}

const museumBase = (name: string) => ({
  name,
  accessibility: { isAccessible: false },
  shortDescription: 'Visitable stops spec',
  ticketInfo: { label: 'free' },
  location: { address: 'x', city: 'Test', latlng: [9.19, 45.46] },
})

const stored = async (id: string) => {
  const tour = await payload.findByID({
    collection: 'tours',
    id,
    depth: 0,
    overrideAccess: true,
  })
  return {
    count: tour.visitableStops,
    ids: (tour.visitableContents ?? []).map((c) => (typeof c === 'string' ? c : c.id)),
  }
}

let author: { id: string }
let other: { id: string }
let museum: { id: string }
let objectA: { id: string }
let objectB: { id: string }
let contentA: { id: string }
let contentB: { id: string }
let tour: { id: string }

beforeAll(async () => {
  await requireMongoDB()
  payload = await getPayload({ config: await config })
  const user = (name: string) =>
    make('users', {
      email: `vs-${name}-${suffix}@example.com`,
      password: 'test-password',
      username: `vs${name}${suffix}`,
      name: { firstName: name, lastName: 'Spec', fullName: `${name} Spec` },
    })
  ;[author, other] = [await user('author'), await user('other')]
  objectA = await make('objects', { name: `VS A ${suffix}` })
  objectB = await make('objects', { name: `VS B ${suffix}` })
  const content = (title: string, object: { id: string }, owner = author) =>
    make('contents', { title, difficulty: 'easy', body, author: owner.id, objects: {} }).then(
      async (doc) => {
        await payload.update({
          collection: 'objects',
          id: object.id,
          data: { contents: [doc.id] },
          context: { skipMintModelGeneration: true },
          overrideAccess: true,
        })
        return doc
      },
    )
  contentA = await content(`VS content A ${suffix}`, objectA)
  contentB = await content(`VS content B ${suffix}`, objectB)
  // Only A is on the map: B's stop is unavailable.
  museum = await make('museums', { ...museumBase(`VS ${suffix}`), map: mapWith([objectA.id]) })
  tour = await make('tours', {
    title: `VS tour ${suffix}`,
    contents: [contentA.id, contentB.id],
    museum: museum.id,
    author: author.id,
  })
}, 60_000)

afterAll(async () => {
  for (const { collection, id } of [...created].reverse()) {
    await payload.delete({ collection, id, overrideAccess: true }).catch(() => undefined)
  }
})

describe('visitable stops of a tour', () => {
  it('are computed when the tour is saved: placed objects only', async () => {
    expect(await stored(tour.id)).toEqual({ count: 1, ids: [contentA.id] })
  })

  it('ignore what a client sends for them', async () => {
    const updated = await payload.update({
      collection: 'tours',
      id: tour.id,
      data: { title: `VS tour ${suffix}!`, visitableStops: 99, visitableContents: [contentB.id] },
      user: { collection: 'users', ...author } as never,
      overrideAccess: false,
      depth: 0,
    })
    expect(updated.visitableStops).toBe(1)
    expect(await stored(tour.id)).toEqual({ count: 1, ids: [contentA.id] })
  })

  it('follow the museum map', async () => {
    await payload.update({
      collection: 'museums',
      id: museum.id,
      data: { map: mapWith([objectA.id, objectB.id]) },
      overrideAccess: true,
    })
    expect((await stored(tour.id)).count).toBe(2)
    await payload.update({
      collection: 'museums',
      id: museum.id,
      data: { map: mapWith([objectB.id]) },
      overrideAccess: true,
    })
    expect(await stored(tour.id)).toEqual({ count: 1, ids: [contentB.id] })
  })

  it('follow the contents of an object', async () => {
    await payload.update({
      collection: 'objects',
      id: objectB.id,
      data: { contents: [] },
      context: { skipMintModelGeneration: true },
      overrideAccess: true,
    })
    // Nothing left: the tour has no visitable stop and leaves the lists.
    expect(await stored(tour.id)).toEqual({ count: 0, ids: [] })
    await payload.update({
      collection: 'objects',
      id: objectB.id,
      data: { contents: [contentB.id] },
      context: { skipMintModelGeneration: true },
      overrideAccess: true,
    })
    expect((await stored(tour.id)).count).toBe(1)
  })

  it('follow the content: a private stop of another author, and deletion', async () => {
    // A private tour may mix contents (`guardTourContents`): its author's own
    // private content is readable, until the content changes hands.
    await payload.update({
      collection: 'museums',
      id: museum.id,
      data: { map: mapWith([objectA.id, objectB.id]) },
      overrideAccess: true,
    })
    const privateContent = await make('contents', {
      title: `VS private ${suffix}`,
      difficulty: 'easy',
      body,
      visibility: 'private',
      author: author.id,
      objects: {},
    })
    await payload.update({
      collection: 'objects',
      id: objectA.id,
      data: { contents: [contentA.id, privateContent.id] },
      context: { skipMintModelGeneration: true },
      overrideAccess: true,
    })
    const mine = await make('tours', {
      title: `VS private tour ${suffix}`,
      visibility: 'private',
      contents: [contentA.id, privateContent.id],
      museum: museum.id,
      author: author.id,
    })
    expect(await stored(mine.id)).toEqual({ count: 2, ids: [contentA.id, privateContent.id] })
    await payload.update({
      collection: 'contents',
      id: privateContent.id,
      data: { author: other.id },
      overrideAccess: true,
    })
    expect(await stored(mine.id)).toEqual({ count: 1, ids: [contentA.id] })

    // A deleted content leaves a dangling id in its tours: no longer a stop.
    expect((await stored(tour.id)).count).toBe(2)
    await payload.delete({ collection: 'contents', id: contentB.id, overrideAccess: true })
    expect(await stored(tour.id)).toEqual({ count: 1, ids: [contentA.id] })
  })
})

describe('lists hide a tour with no visitable stop', () => {
  it('LISTED_TOURS leaves it out, and the search row goes with it', async () => {
    const listed = async () =>
      (
        await payload.find({
          collection: 'tours',
          where: { and: [LISTED_TOURS, { id: { equals: tour.id } }] },
          depth: 0,
          overrideAccess: true,
        })
      ).totalDocs
    const inSearch = async () =>
      (
        await payload.find({
          collection: 'search',
          where: { 'doc.value': { equals: tour.id } },
          depth: 0,
          overrideAccess: true,
        })
      ).totalDocs
    // A is taken off the map and B's content is gone: nothing left to visit.
    await payload.update({
      collection: 'museums',
      id: museum.id,
      data: { map: mapWith([objectB.id]) },
      overrideAccess: true,
    })
    expect((await stored(tour.id)).count).toBe(0)
    expect(await listed()).toBe(0)
    expect(await inSearch()).toBe(0)

    // The map places A again: the stop is back, so are the list and the row.
    await payload.update({
      collection: 'museums',
      id: museum.id,
      data: { map: mapWith([objectA.id]) },
      overrideAccess: true,
    })
    expect((await stored(tour.id)).count).toBe(1)
    expect(await listed()).toBe(1)
    expect(await inSearch()).toBe(1)
  })

  it('a tour without a stored count (not backfilled) stays listed', async () => {
    expect(isEmptyTour({ visitableStops: 0 })).toBe(true)
    expect(isEmptyTour({ visitableStops: null })).toBe(false)
    expect(isEmptyTour({})).toBe(false)
  })
})

describe('summaries count the visitable stops', () => {
  const stop = (id: string, durationSeconds: number) => ({ id, durationSeconds }) as never
  const base = {
    id: 't',
    title: 't',
    contents: [stop('a', 120), stop('b', 600), 'gone'],
    visitableContents: ['a'],
  } as unknown as Tour

  it('leave the unavailable stops out of the count and the reading time', () => {
    const summary = summarizeTour(base)
    expect(summary.stops).toBe(1)
    expect(summary.readingMinutes).toBe(2)
    expect(withVisitableStops(base).contents).toHaveLength(1)
  })

  it('keep every stop when the tour has no stored list yet', () => {
    const legacy = { ...base, visitableContents: undefined } as Tour
    expect(summarizeTour(legacy).stops).toBe(3)
  })

  it('the planner’s estimate still wins for the visit time', () => {
    expect(summarizeTour({ ...base, durationMinutes: 40 }).visitMinutes).toBe(40)
  })
})
