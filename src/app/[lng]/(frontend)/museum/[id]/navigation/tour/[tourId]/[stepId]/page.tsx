import { getNavigationTour, requireTourStep } from '../../../data'

/**
 * Validate the URL cursor against the tour's visitable stops (a stale one
 * lands on the completed step); the persistent museum navigation layout
 * renders the map.
 */
export default async function TourNavigationStep({
  params,
  searchParams,
}: PageProps<'/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]'>) {
  const { lng, id, tourId, stepId } = await params
  const tour = await getNavigationTour(tourId, lng)
  requireTourStep(tour, stepId, { lng, museumId: id }, await searchParams)
  return null
}
