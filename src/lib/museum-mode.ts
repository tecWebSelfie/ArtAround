import 'server-only'

import config from '@/payload.config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'
import { OBJECT_ID, MUSEUM_MODE_COOKIE } from '@/lib/museum-cookie'

/**
 * Museum mode: the app can be locked to one museum ("Museo di Torino" mode)
 * instead of showing every museum (global mode). The choice is one cookie,
 * set from the "Change museum" modal by picking a museum or importing its
 * config file (`MuseumSwitch`). Server pages read it here to scope what they
 * show; removing the cookie returns to global mode.
 */

/** The museum the app is locked to, or `null` in global mode. */
export async function lockedMuseumId() {
  const value = (await cookies()).get(MUSEUM_MODE_COOKIE)?.value
  return value && OBJECT_ID.test(value) ? value : null
}

/**
 * What the locked museum shows: its objects (the map-derived index) and their
 * contents. Search uses only the `museumId` (through the index's `museum_id`
 * filter); the object and content ids still scope the map and the pages that
 * read Payload directly. `null` in global mode.
 * React.cache: the tabs layout and its page both ask within one request.
 */
export const museumScope = cache(async () => {
  const museumId = await lockedMuseumId()
  if (!museumId) return null
  const payload = await getPayload({ config })
  const museum = await payload
    .findByID({
      collection: 'museums',
      id: museumId,
      depth: 0,
      select: { name: true, objects: true, palette: true },
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
  // `palette` themes the app for this museum (`museumTheme` decides if it is usable).
  return { museumId, name: museum.name, palette: museum.palette, objectIds, contentIds }
})

/**
 * Museum mode for the search index: the locked museum's id, or `null` in
 * global mode. Every indexed document carries the `museum_id` values it
 * belongs to (a tour its museum, a content/object/user the museums of their
 * work), so scoping a search is one `filter_by` instead of rebuilding id
 * lists. Shared by the navigator search, the marketplace and `/search/*`, so
 * they all scope alike.
 */
export const museumSearchMuseumId = cache(async () => (await museumScope())?.museumId ?? null)
