import { redirect, notFound } from 'next/navigation'
import { tourNavigationPath, tourStepIndex, withNavigationPosition } from '@/lib/tour-navigation'
import { getNavigationTour } from '../../../../../data'

/** Intercepts a canonical object URL so its details open over the active tour map. */
export default async function ObjectModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; stepId: string; objectId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, stepId, objectId } = await params
  const tour = await getNavigationTour(id)
  const step = tourStepIndex(stepId, tour.contents.length)
  if (step === null) notFound()
  redirect(
    withNavigationPosition(
      `${tourNavigationPath(lng, id, step)}/object/${objectId}`,
      await searchParams,
    ),
  )
}
