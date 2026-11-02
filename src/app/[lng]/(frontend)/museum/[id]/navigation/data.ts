import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { validateBuildJson } from '@pascal-app/core'
import { normalizeLocale } from '@/lib/localized'
import { placedObjectIds, type NavigationCatalogObject } from '@/lib/tour-navigation'
import type { Museum, Tour } from '@/payload-types'
import { isLocked } from '@/lib/price'
import { asViewer } from '@/lib/session'
import type { NavigationTourSummary } from './TourNavigationShell'
export { getLocalizedPageDocument as getNavigationDocument } from '@/lib/localized-page'

/**
 * Server reads of the museum navigation tree (`/[lng]/museum/[id]/navigation`,
 * free navigation and its tours under `…/tour/[tourId]/[stepId]`), shared by
 * the persistent shell (museum layout) and the modal slots. React.cache
 * deduplicates them within one request.
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
const NAVIGATION_TOUR_POPULATE = {
  contents: { title: true, difficulty: true, readingTimeMins: true, objects: true },
  museums: { name: true },
  users: { name: true },
} as const

/** React.cache deduplicates the same tour lookup when the shell and modal both need it. */
export const getNavigationTour = cache(async (id: string) => {
  const payload = await getPayload({ config })
  return payload.findByID({
    collection: 'tours',
    id,
    depth: 1,
    populate: NAVIGATION_TOUR_POPULATE,
  })
})

/** A tour as the persistent shell holds it: the museum reduced to its id. */
export type NavigationTour = Omit<Tour, 'museum'> & { museum: string }

/**
 * Every tour of the museum, read once by the museum navigation layout. The
 * layout cannot see the `[tourId]` segment below it, so the shell holds them
 * all and picks the one in the URL: starting a tour from free navigation then
 * only changes the URL, and the map stays mounted (docs/tour-navigation.md).
 * `summaries` are the non-empty ones, offered as "start this tour" in the
 * Spotlight.
 */
export const getMuseumNavigationTours = cache(
  async (
    museumId: string,
    lng: string,
  ): Promise<{ tours: NavigationTour[]; summaries: NavigationTourSummary[] }> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'tours',
      where: { museum: { equals: museumId } },
      depth: 1,
      populate: NAVIGATION_TOUR_POPULATE,
      locale: lng as never,
      sort: 'title',
      pagination: false,
    })
    const tours = docs.map((tour) => ({ ...tour, museum: museumId }))
    return {
      tours,
      summaries: tours
        .filter((tour) => (tour.contents?.length ?? 0) > 0)
        .map((tour) => ({ id: tour.id, title: tour.title, stops: tour.contents.length })),
    }
  },
)

/**
 * Builds the museum-scoped Spotlight catalog from the objects placed on its
 * Pascal map. Only summaries cross into the client; full localized copy is
 * fetched when a visitor opens an object or content.
 */
export async function getNavigationCatalog(
  museum: Museum,
  lng: string,
): Promise<NavigationCatalogObject[]> {
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
    select: { name: true, contents: true },
    // `price` + `body` let the server tell paid-and-locked contents apart.
    // Read as the visitor: field access withholds `body` exactly when they
    // aren't entitled to it, so `isLocked` needs no rules of its own.
    populate: { contents: { title: true, price: true, body: true } },
    locale: normalizeLocale(lng) ?? 'en',
    depth: 1,
    pagination: false,
    ...(await asViewer()),
  })
  return objects.docs.map((object) => ({
    id: object.id,
    name: object.name,
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
}
