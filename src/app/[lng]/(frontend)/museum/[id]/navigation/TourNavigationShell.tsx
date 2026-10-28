'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { validateBuildJson } from '@pascal-app/core'
import { useParams, useRouter } from 'next/navigation'
import type { Museum, Tour } from '@/payload-types'
import {
  museumNavigationPath,
  placedObjectIds,
  navigationBasePath,
  tourStepIndex,
  type NavigationCatalogObject,
  type NavigationScope,
} from '@/lib/tour-navigation'
import { SpeechProvider } from '@/components/assistant/speech-context'
import { TourNavigationPage } from './TourNavigation'
import type { NavigationTour } from './data'

/** A tour of this museum, as free navigation's Spotlight offers it. */
export type NavigationTourSummary = Pick<Tour, 'id' | 'title'> & { stops: number }

type TourNavigationData = {
  /** The tour in the URL (`…/navigation/tour/[tourId]`); `null` in free navigation. */
  tour: NavigationTour | null
  museumId: string
  catalog: NavigationCatalogObject[]
  placedObjectIds: ReadonlySet<string>
}

const TourNavigationDataContext = createContext<TourNavigationData | null>(null)

/** Shared tour/catalog data and map-derived IDs; each consumer reads URL state from Next. */
export const useTourNavigationData = () => useContext(TourNavigationDataContext)

/**
 * The current navigation scope and its map URL, for anything rendered over the
 * map (modals, object actions, scanner). `null` outside a navigation shell, or
 * on a tour URL whose cursor is invalid.
 */
export function useNavigationScope() {
  const data = useTourNavigationData()
  const { lng, stepId } = useParams<{ lng: string; stepId?: string }>()
  if (!data) return null
  if (!data.tour) {
    const scope: NavigationScope = { kind: 'free', museumId: data.museumId }
    return { scope, base: museumNavigationPath(lng, data.museumId), data }
  }
  const step = stepId ? tourStepIndex(stepId, data.tour.contents.length) : null
  if (step === null) return null
  const scope: NavigationScope = { kind: 'tour', tour: data.tour, step }
  return { scope, base: navigationBasePath(lng, scope), data }
}

/**
 * The one persistent map of a museum's navigation (mounted by its layout):
 * keeps the map mounted while step, modal and tour URLs change, and shares
 * stable catalog data. The URL decides what it shows: free navigation
 * (`/navigation`, no `tourId`; the map is always shown) or one of `tours`
 * (`/navigation/tour/[tourId]`; the map appears once the URL has a cursor,
 * the start page before). Starting a tour from free navigation keeps the same
 * `TourNavigationPage` element, so the map is not remounted.
 */
export function TourNavigationShell({
  museum,
  catalog,
  tours,
  summaries,
  children,
}: {
  museum: Museum
  catalog: NavigationCatalogObject[]
  /** Every tour of this museum; the one in the URL is the active tour. */
  tours: NavigationTour[]
  /** Free navigation only: the museum's tours, startable from the Spotlight. */
  summaries: NavigationTourSummary[]
  children: ReactNode
}) {
  const { tourId, stepId } = useParams<{ tourId?: string; stepId?: string }>()
  const router = useRouter()
  const tour = tourId ? (tours.find((candidate) => candidate.id === tourId) ?? null) : null
  // A tour created after this layout was rendered (e.g. just planned) is not
  // in `tours` yet: the tour layout has validated it, so refetch the layout.
  const unknownTour = Boolean(tourId) && !tour
  useEffect(() => {
    if (unknownTour) router.refresh()
  }, [unknownTour, router])
  // Only actual museum ItemNodes can be used as positions or destinations.
  const placedIds = useMemo(
    () => placedObjectIds(validateBuildJson(museum.map).parsed),
    [museum.map],
  )
  const scope: NavigationScope | null = !tourId
    ? { kind: 'free', museumId: museum.id }
    : (() => {
        const step = tour && stepId ? tourStepIndex(stepId, tour.contents.length) : null
        return tour && step !== null ? { kind: 'tour', tour, step } : null
      })()

  return (
    <TourNavigationDataContext.Provider
      value={{ tour, museumId: museum.id, catalog, placedObjectIds: placedIds }}
    >
      {/* Map and modal slot share one speech player (see speech-context). */}
      <SpeechProvider>
        {scope === null ? (
          // A tour before its cursor: the start page (no map yet).
          children
        ) : (
          <>
            <TourNavigationPage
              scope={
                scope.kind === 'tour' ? { kind: 'tour', tour: tour!, step: scope.step } : scope
              }
              museum={museum}
              catalog={catalog}
              tours={summaries}
            />
            {children}
          </>
        )}
      </SpeechProvider>
    </TourNavigationDataContext.Provider>
  )
}
