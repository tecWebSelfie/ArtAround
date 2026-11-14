import { isPersonalTour } from '@/lib/visibility'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import {
  getNavigationCatalog,
  museumPlacedObjects,
  NAVIGATION_TOUR_POPULATE,
} from '@/lib/navigation-tour.server'
import { notFound, redirect } from 'next/navigation'
import {
  tourNavigationPath,
  tourStepIndex,
  visitableTour,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import type { Museum, Tour } from '@/payload-types'
import { asViewer } from '@/lib/session'
import type { NavigationTourSummary } from './TourNavigationShell'
export { getLocalizedPageDocument as getNavigationDocument } from '@/lib/localized-page'
// The shared reads (museum, catalog, one visitable tour) live in `lib`: the
// tour quiz counts the same stops.
export {
  getNavigationCatalog,
  getNavigationMuseum,
  getNavigationTour,
} from '@/lib/navigation-tour.server'

/**
 * Server reads of the museum navigation tree (`/[lng]/museum/[id]/navigation`,
 * free navigation and its tours under `…/tour/[tourId]/[stepId]`), shared by
 * the persistent shell (museum layout) and the modal slots. React.cache
 * deduplicates them within one request.
 */

/** A tour as the persistent shell holds it: the museum reduced to its id. */
export type NavigationTour = Omit<Tour, 'museum'> & { museum: string }

/**
 * Every tour of the museum, read once by the museum navigation layout. The
 * layout cannot see the `[tourId]` segment below it, so the shell holds them
 * all and picks the one in the URL: starting a tour from free navigation then
 * only changes the URL, and the map stays mounted (docs/tour-navigation.md).
 * Each tour arrives with its unavailable stops already dropped
 * (`visitableTour`), the same list the pages index, so the shell, its progress
 * and the Spotlight never see a stop the visitor can't reach. `summaries` are
 * the ones left with a visitable stop, offered as "start this tour" in the
 * Spotlight.
 */
export const getMuseumNavigationTours = cache(
  async (
    museum: Museum,
    lng: string,
  ): Promise<{ tours: NavigationTour[]; summaries: NavigationTourSummary[] }> => {
    const payload = await getPayload({ config })
    const [{ docs }, catalog] = await Promise.all([
      payload.find({
        collection: 'tours',
        where: { museum: { equals: museum.id } },
        depth: 1,
        populate: NAVIGATION_TOUR_POPULATE,
        locale: lng as never,
        sort: 'title',
        pagination: false,
        // As the visitor: private tours stay out of everyone else's list.
        ...(await asViewer()),
      }),
      getNavigationCatalog(museum, lng),
    ])
    const placed = museumPlacedObjects(museum)
    const tours = docs.map((tour) => ({
      ...visitableTour(tour, catalog, placed),
      museum: museum.id,
    }))
    return {
      tours,
      summaries: tours
        // Not one visitor's own tours (planned visits, visit copies): those
        // open from their own link or start page.
        .filter((tour) => (tour.contents?.length ?? 0) > 0 && !isPersonalTour(tour))
        .map((tour) => ({ id: tour.id, title: tour.title, stops: tour.contents.length })),
    }
  },
)

/**
 * The URL cursor of a tour page, validated against the visitable stops.
 * `404` for a malformed cursor. A numeric cursor past the end is a *stale*
 * one (a bookmark, a group host's link, or a visit during which a stop became
 * unavailable and the list shrank): it lands on the completed step instead of
 * an error page, which is also how a shifted index can never crash or loop
 * (the redirect target is always valid for the same list).
 */
export function requireTourStep(
  tour: Pick<Tour, 'id' | 'contents'>,
  stepId: string,
  where: { lng: string; museumId: string },
  search?: Record<string, string | string[] | undefined>,
): number {
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step !== null) return step
  if (/^\d+$/.test(stepId)) {
    const done = tourNavigationPath(where.lng, where.museumId, tour.id, tour.contents.length)
    redirect(withNavigationPosition(done, search ?? {}))
  }
  notFound()
}
