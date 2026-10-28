import { Suspense } from 'react'
import { TourNavigationShell } from './TourNavigationShell'
import { getMuseumNavigationTours, getNavigationCatalog, getNavigationMuseum } from './data'

/**
 * The museum's navigation: ONE persistent map shell for free navigation
 * (`/[lng]/museum/[id]/navigation`) and for each of its tours
 * (`…/navigation/tour/[tourId]/[stepId]`). Contents and objects open in the
 * `@modal` slots (this one for the free map, the tour's own below
 * `[stepId]`), the scanner at `/scan`, so the map stays mounted while the URL
 * changes, including when the visitor starts a tour from the Spotlight.
 * A layout cannot read the `[tourId]` below it, so it hands the shell all of
 * the museum's tours and the shell picks the one in the URL.
 */
export default async function MuseumNavigationLayout({
  params,
  children,
  modal,
}: LayoutProps<'/[lng]/museum/[id]/navigation'>) {
  const { lng, id } = await params
  const museum = await getNavigationMuseum(id, lng)
  const [catalog, { tours, summaries }] = await Promise.all([
    getNavigationCatalog(museum, lng),
    getMuseumNavigationTours(museum.id, lng),
  ])
  return (
    <Suspense>
      <TourNavigationShell museum={museum} catalog={catalog} tours={tours} summaries={summaries}>
        {children}
        {modal}
      </TourNavigationShell>
    </Suspense>
  )
}
