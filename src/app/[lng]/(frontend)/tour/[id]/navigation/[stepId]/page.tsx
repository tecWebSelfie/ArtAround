import { getNavigationTour } from '../data'
import { tourStepIndex } from '@/lib/tour-navigation'
import { notFound } from 'next/navigation'

/** Validate the URL cursor; the persistent navigation layout renders the map. */
export default async function TourNavigationLayout({
  params,
}: PageProps<'/[lng]/tour/[id]/navigation/[stepId]'>) {
  const { id: tourId, stepId } = await params
  const tour = await getNavigationTour(tourId)
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step === null) notFound()
  return null
}
