'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { validateBuildJson } from '@pascal-app/core'
import { useParams } from 'next/navigation'
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
import { TourNavigationPage } from './[stepId]/TourNavigation'

/** A tour of this museum, as free navigation's Spotlight offers it. */
export type NavigationTourSummary = Pick<Tour, 'id' | 'title'> & { stops: number }

type TourNavigationData = {
  /** `null` in free navigation (`/museum/[id]/navigation`). */
  tour: Tour | null
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
 * Keeps the map mounted while step and modal URLs change, and shares stable
 * catalog data. Serves both a tour (`tour` set; the map appears once the URL
 * has a cursor) and free navigation (`tour` null; the map is always shown).
 */
export function TourNavigationShell({
  tour,
  museum,
  catalog,
  tours = [],
  children,
}: {
  tour: Tour | null
  museum: Museum
  catalog: NavigationCatalogObject[]
  /** Free navigation only: the museum's tours, startable from the Spotlight. */
  tours?: NavigationTourSummary[]
  children: ReactNode
}) {
  const { stepId } = useParams<{ stepId?: string }>()
  // Only actual museum ItemNodes can be used as positions or destinations.
  const placedIds = useMemo(
    () => placedObjectIds(validateBuildJson(museum.map).parsed),
    [museum.map],
  )
  const scope: NavigationScope | null = !tour
    ? { kind: 'free', museumId: museum.id }
    : (() => {
        const step = stepId ? tourStepIndex(stepId, tour.contents.length) : null
        return step === null ? null : { kind: 'tour', tour, step }
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
              tours={tours}
            />
            {children}
          </>
        )}
      </SpeechProvider>
    </TourNavigationDataContext.Provider>
  )
}
