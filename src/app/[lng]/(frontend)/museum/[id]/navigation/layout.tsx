import { Suspense } from 'react'
import { getNavigationCatalog } from '@/app/[lng]/(frontend)/tour/[id]/navigation/data'
import { TourNavigationShell } from '@/app/[lng]/(frontend)/tour/[id]/navigation/TourNavigationShell'
import { getMuseumTours, getNavigationMuseum } from './data'

/**
 * Free navigation of a museum: the same persistent map shell as a tour, with
 * no tour (`tour={null}`). Contents and objects open in the `@modal` slot and
 * the scanner at `/scan`, so the map stays mounted while the URL changes.
 * The visitor can start one of the museum's tours from the Spotlight.
 */
export default async function MuseumNavigationLayout({
  params,
  children,
  modal,
}: LayoutProps<'/[lng]/museum/[id]/navigation'>) {
  const { lng, id } = await params
  const museum = await getNavigationMuseum(id, lng)
  const [catalog, tours] = await Promise.all([
    getNavigationCatalog(museum, lng),
    getMuseumTours(museum.id, lng),
  ])
  return (
    <Suspense>
      <TourNavigationShell tour={null} museum={museum} catalog={catalog} tours={tours}>
        {children}
        {modal}
      </TourNavigationShell>
    </Suspense>
  )
}
