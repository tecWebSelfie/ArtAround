import { notFound, redirect } from 'next/navigation'
import { tourContentPath, tourStepIndex, withNavigationPosition } from '@/lib/tour-navigation'
import { getNavigationTour } from '../../../../../data'

/** Intercepts a canonical QR/content URL and redirects it into this tour's modal context. */
export default async function ContentModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; stepId: string; contentId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, stepId, contentId } = await params
  const tour = await getNavigationTour(id)
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step === null) notFound()
  const destination = tourContentPath(lng, tour, step, contentId)
  redirect(withNavigationPosition(destination, await searchParams))
}
