import 'server-only'

import config from '@/payload.config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

/**
 * Museum mode: the app can be locked to one museum ("Museo di Torino" mode)
 * instead of showing every museum (global mode). The choice is one cookie,
 * set from the "Change museum" modal by picking a museum or importing its
 * config file (`MuseumSwitch`). Server pages read it here to scope what they
 * show; removing the cookie returns to global mode.
 */
export const MUSEUM_MODE_COOKIE = 'aa-museum'

/** The museum the app is locked to, or `null` in global mode. */
export async function lockedMuseumId() {
  const value = (await cookies()).get(MUSEUM_MODE_COOKIE)?.value
  return value && /^[a-f0-9]{24}$/.test(value) ? value : null
}

/**
 * What the locked museum shows: its objects (the map-derived index) and their
 * contents. Search pages add these IDs to their queries, so in museum mode
 * every list holds only that museum. `null` in global mode.
 */
export async function museumScope() {
  const museumId = await lockedMuseumId()
  if (!museumId) return null
  const payload = await getPayload({ config })
  const museum = await payload
    .findByID({
      collection: 'museums',
      id: museumId,
      depth: 0,
      select: { name: true, objects: true },
    })
    .catch(() => null)
  // A cookie for a deleted museum behaves like global mode.
  if (!museum) return null
  const objectIds = (museum.objects ?? []).map((entry) =>
    typeof entry === 'string' ? entry : entry.id,
  )
  const { docs } = await payload.find({
    collection: 'objects',
    where: { id: { in: objectIds } },
    depth: 0,
    pagination: false,
    select: { contents: true },
  })
  const contentIds = docs.flatMap((object) =>
    (object.contents ?? []).map((content) => (typeof content === 'string' ? content : content.id)),
  )
  return { museumId, name: museum.name, objectIds, contentIds }
}

export type MuseumScope = NonNullable<Awaited<ReturnType<typeof museumScope>>>

/**
 * Museum mode for the search index (`querySearchIndex({ restrictTo })`): per
 * kind, the source ids the locked museum allows. People are the authors of its
 * tours and contents, so a creator shows up only through work in this museum.
 * Shared by the navigator search and the marketplace, so both scope alike.
 */
export async function museumSearchRestriction(scope: MuseumScope) {
  const payload = await getPayload({ config })
  const [tours, contents] = await Promise.all([
    payload.find({
      collection: 'tours',
      where: { museum: { equals: scope.museumId } },
      depth: 0,
      pagination: false,
      select: { author: true },
    }),
    payload.find({
      collection: 'contents',
      where: { id: { in: scope.contentIds } },
      depth: 0,
      pagination: false,
      select: { author: true },
    }),
  ])
  const authorId = (author: unknown) =>
    typeof author === 'string' ? author : (author as { id?: string } | null)?.id
  const authors = new Set(
    [...tours.docs, ...contents.docs].flatMap((doc) => {
      const id = authorId((doc as { author?: unknown }).author)
      return id ? [String(id)] : []
    }),
  )
  return {
    museum: [scope.museumId],
    tour: tours.docs.map((tour) => String(tour.id)),
    content: scope.contentIds,
    object: scope.objectIds,
    user: [...authors],
  }
}
