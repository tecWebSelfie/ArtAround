import { notFound } from 'next/navigation'
import { tourMuseumId } from '@/lib/tour-navigation'
import { getNavigationTour } from '../../data'

/**
 * Guards the tour branch of the museum navigation: the tour must exist and
 * belong to the museum in the URL (the shell above only knows this museum's
 * tours). Old `/[lng]/tour/[id]/navigation/...` links reach here through the
 * permanent redirect in `tour/[id]/navigation/[[...rest]]/route.ts`, which
 * always picks the tour's own museum.
 */
export default async function TourBranchLayout({
  params,
  children,
}: LayoutProps<'/[lng]/museum/[id]/navigation/tour/[tourId]'>) {
  const { id, tourId } = await params
  const tour = await getNavigationTour(tourId).catch(() => null)
  if (!tour || tourMuseumId(tour) !== id) notFound()
  return children
}
