import { notFound } from 'next/navigation'
import { tourMuseumId } from '@/lib/tour-navigation'
import { getNavigationTour } from '../../data'
import { TranslationPending } from '@/components/TranslationPending'
import { normalizeLocale, requestTourTranslations } from '@/lib/localized'
import config from '@/payload.config'
import { getPayload } from 'payload'

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
  const { lng, id, tourId } = await params
  const tour = await getNavigationTour(tourId).catch(() => null)
  if (!tour || tourMuseumId(tour) !== id) notFound()
  // The shell shows this tour's title, directions and stop titles in the
  // visitor's language, falling back to English: queue what is missing and
  // refresh quietly until it arrives.
  const pending = await requestTourTranslations(
    await getPayload({ config }),
    tour,
    normalizeLocale(lng) ?? 'en',
  )
  return (
    <>
      {children}
      {pending && <TranslationPending silent />}
    </>
  )
}
