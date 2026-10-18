'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { validateBuildJson } from '@pascal-app/core'
import { useParams } from 'next/navigation'
import type { Museum, Tour } from '@/payload-types'
import { museumObjectId, tourStepIndex, type NavigationCatalogObject } from '@/lib/tour-navigation'
import { TourNavigationPage } from './[stepId]/TourNavigation'

type TourNavigationData = {
  tour: Tour
  catalog: NavigationCatalogObject[]
  placedObjectIds: ReadonlySet<string>
}

const TourNavigationDataContext = createContext<TourNavigationData | null>(null)

/** Shared tour/catalog data and map-derived IDs; each consumer reads URL state from Next. */
export const useTourNavigationData = () => useContext(TourNavigationDataContext)

/** Keeps the map mounted while step and modal URLs change, and shares stable catalog data. */
export function TourNavigationShell({
  tour,
  museum,
  catalog,
  children,
}: {
  tour: Tour
  museum: Museum
  catalog: NavigationCatalogObject[]
  children: ReactNode
}) {
  const { stepId } = useParams<{ stepId?: string }>()
  const placedObjectIds = useMemo(() => {
    const map = validateBuildJson(museum.map).parsed
    // Only actual museum ItemNodes can be used as positions or destinations.
    return new Set(
      Object.values(map?.nodes ?? {}).flatMap((node) => {
        const id = museumObjectId(node)
        return id ? [id] : []
      }),
    )
  }, [museum.map])
  const step = stepId ? tourStepIndex(stepId, tour.contents.length) : null

  return (
    <TourNavigationDataContext.Provider value={{ tour, catalog, placedObjectIds }}>
      {step === null ? (
        children
      ) : (
        <>
          <TourNavigationPage tour={tour} step={step} museum={museum} catalog={catalog} />
          {children}
        </>
      )}
    </TourNavigationDataContext.Provider>
  )
}
