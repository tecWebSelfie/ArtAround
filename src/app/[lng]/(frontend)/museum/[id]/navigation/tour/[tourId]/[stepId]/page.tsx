import { getNavigationTour } from '../../../data'
import { tourStepIndex } from '@/lib/tour-navigation'
import { notFound } from 'next/navigation'

/** Validate the URL cursor; the persistent museum navigation layout renders the map. */
export default async function TourNavigationStep({
  params,
}: PageProps<'/[lng]/museum/[id]/navigation/tour/[tourId]/[stepId]'>) {
  const { tourId, stepId } = await params
  const tour = await getNavigationTour(tourId)
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step === null) notFound()
  return null
}
