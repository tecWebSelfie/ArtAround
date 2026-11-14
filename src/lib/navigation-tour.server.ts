import 'server-only'

import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { validateBuildJson } from '@pascal-app/core'
import type { Museum, Subject } from '@/payload-types'
import { filterPopulated } from '@/lib/isPopulated'
import { isLocked } from '@/lib/price'
import { normalizeLocale } from '@/lib/localized'
import { asViewer } from '@/lib/session'
import {
  museumPlacedObjects,
  placedObjectIds,
  tourMuseumId,
  visitableTour,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'

/**
 * Server reads shared by the museum navigation tree
 * (`src/app/[lng]/(frontend)/museum/[id]/navigation`) and the tour quiz, which
 * must agree on what a tour's stops are. React.cache deduplicates them within
 * one request. They live in `lib` (not beside the navigation routes) because
 * the quiz, outside that tree, counts the same visitable stops.
 */

export const getNavigationMuseum = cache(async (id: string, lng: string) => {
  const payload = await getPayload({ config })
  const museum = await payload
    .findByID({
      collection: 'museums',
      id,
      depth: 0,
      locale: lng as never,
      // Map, navmeshes and catalog index are public museum data.
      overrideAccess: true,
    })
    // A stale, mistyped or deleted museum id is a missing page, not a server error.
    .catch(() => null)
  if (!museum) notFound()
  return museum
})

/**
 * How navigation reads a tour: its stops populated with what the map and
 * progress show. The museum is the shell's own read, so only its name comes
 * along (never its map/navmeshes again); the author only by name.
 */
export const NAVIGATION_TOUR_POPULATE = {
  contents: { title: true, difficulty: true, durationSeconds: true, objects: true },
  museums: { name: true },
  users: { name: true },
} as const

/**
 * Builds the museum-scoped Spotlight catalog from the objects placed on its
 * Pascal map. Only summaries cross into the client; full localized copy is
 * fetched when a visitor opens an object or content. Cached on the museum
 * object (itself cached per request) so the layout, the tours and the pages
 * share one read.
 */
export const getNavigationCatalog = cache(
  async (museum: Museum, lng: string): Promise<NavigationCatalogObject[]> => {
    const payload = await getPayload({ config })
    // `museums.objects` is the map-derived index; maps saved before that index
    // existed are read directly so older museums keep their catalog.
    const ids = new Set(
      (museum.objects ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.id)),
    )
    for (const id of placedObjectIds(validateBuildJson(museum.map).parsed)) ids.add(id)
    if (!ids.size) return []
    const objects = await payload.find({
      collection: 'objects',
      where: { id: { in: [...ids] } },
      select: { name: true, contents: true, creators: true, movements: true, thumbnail: true },
      // `price` + `body` let the server tell paid-and-locked contents apart.
      // Read as the visitor: field access withholds `body` exactly when they
      // aren't entitled to it, so `isLocked` needs no rules of its own.
      populate: {
        contents: { title: true, price: true, body: true },
        subjects: { name: true },
        objectsThumbnails: { sizes: true, thumbnailURL: true },
      },
      locale: normalizeLocale(lng) ?? 'en',
      depth: 1,
      pagination: false,
      ...(await asViewer()),
    })
    // Populated subjects only, as `{ id, name }` (what the commands need).
    const named = (list: (string | Subject)[] | null | undefined) =>
      filterPopulated<Subject>(list).map(({ id, name }) => ({ id: String(id), name }))
    return objects.docs.map((object) => ({
      id: object.id,
      name: object.name,
      // Recognition needs only the card derivative, never the full-size artwork.
      thumbnail:
        typeof object.thumbnail === 'object' && object.thumbnail
          ? (object.thumbnail.sizes?.card?.url ?? object.thumbnail.thumbnailURL ?? null)
          : null,
      creators: named(object.creators),
      movements: named(object.movements),
      // Only the summary crosses into the client: the body stays on the server.
      contents: (object.contents ?? []).flatMap((content) =>
        typeof content === 'string'
          ? []
          : [
              {
                id: content.id,
                title: content.title,
                price: content.price ?? null,
                locked: isLocked(content),
              },
            ],
      ),
    }))
  },
)

/**
 * A tour as the visitor navigates it: read as the visitor, with its
 * unavailable stops already dropped (`visitableTour`), so the cursor, the
 * progress, the quiz's "unvisited" count and every page index one list. The
 * museum comes from the tour itself; its map and catalog are the cached
 * reads the layout makes anyway.
 */
export const getNavigationTour = cache(async (id: string, lng: string) => {
  const payload = await getPayload({ config })
  const tour = await payload.findByID({
    collection: 'tours',
    id,
    depth: 1,
    populate: NAVIGATION_TOUR_POPULATE,
    // As the visitor: a private tour is readable only by its author and its
    // group's guests (`readTours`), and its private stops likewise.
    ...(await asViewer()),
  })
  const museum = await getNavigationMuseum(tourMuseumId(tour), lng)
  const catalog = await getNavigationCatalog(museum, lng)
  return visitableTour(tour, catalog, museumPlacedObjects(museum))
})
