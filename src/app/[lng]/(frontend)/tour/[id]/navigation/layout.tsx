import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getNavigationCatalog, getNavigationTour } from './data'
import { TourNavigationShell } from './TourNavigationShell'

/** Loads shared server data once and keeps the tour map mounted across child routes. */
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lng: string; id: string }>
  children: React.ReactNode
}) {
  const { lng, id } = await params
  const tour = await getNavigationTour(id)
  const museum = tour.museum?.docs?.[0]
  if (!museum || typeof museum === 'string') notFound()
  const catalog = await getNavigationCatalog(museum, lng)
  // Avoid serializing the full museum twice: the shell needs its map,
  // while the tour only needs the joined museum ID after this point.
  return (
    <Suspense>
      <TourNavigationShell
        tour={{ ...tour, museum: { docs: [museum.id] } }}
        museum={museum}
        catalog={catalog}
      >
        {children}
      </TourNavigationShell>
    </Suspense>
  )
}
