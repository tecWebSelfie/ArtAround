'use client'

import { useSharedSpeech } from '@/components/assistant/speech-context'
import { useSpeech } from '@/components/assistant/use-speech'
import type { Museum, Tour } from '@/payload-types'
import { useElementSize } from '@mantine/hooks'
import { validateBuildJson } from '@pascal-app/core'
import {
  collectMuseumMarkers,
  mapNodes,
  type ExitEntranceMarker,
  type ServiceMarker,
} from '@/lib/pascal/museum-plugin/markers-in-map'
import { museumRooms, type MuseumRooms } from '@/lib/museum-rooms'
import { logisticNotes } from '@/lib/tour-logistics'
import type { DirectionStep } from '@/lib/tour-directions'
import {
  DESTINATION_KEYS,
  navigationDestination,
  stopObjectId,
  navigationBasePath,
  withNavigationValue,
  type NavigationCatalogObject,
  type NavigationDestination,
  type NavigationScope,
} from '@/lib/tour-navigation'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { extractID } from 'payload/shared'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStepSentence, type DirectionsStatus } from './DirectionsBar'
import { useNavigationCommands } from './navigation-commands'
import type { NavigationTourSummary } from './TourNavigationShell'
import { useNearbySuggestions } from './use-nearby-suggestions'
import { useGuidanceSettings } from './GuidanceSettings'
import { useGpsFix } from './gps-source'
import { useCompass } from './compass-source'
import { useRouteGuidance } from './use-route-guidance'
import type { MuseumRoute } from './MuseumMap'
import type { NavMesh } from 'navcat'

/**
 * The state behind the navigation page (`TourNavigation.tsx`): the map's
 * derived data, the tour cursor, the measured bars, voice guidance, and the
 * plain functions that turn that state into the strip's status and the
 * assistant's context. Kept apart so the page reads as layout.
 */

/** Bars measured with their padding (stable object: the hook re-observes on change). */
const BORDER_BOX: ResizeObserverOptions = { box: 'border-box' }

/** Publishes a measured height as a root CSS variable while it is known. */
function useRootHeightVariable(name: string, height: number) {
  useEffect(() => {
    if (!height) return
    const root = document.documentElement
    root.style.setProperty(name, `${height}px`)
    return () => {
      root.style.removeProperty(name)
    }
  }, [name, height])
}

/** The museum's declared accessibility, in words the assistant can repeat. */
export function accessibilityContext(museum: Museum) {
  const access = museum.accessibility
  if (!access) return ''
  const features = [
    access.stepFreeEntrance && 'step-free entrance',
    access.elevator && 'elevator',
    access.accessibleBathrooms && 'accessible toilets',
    access.tactilePaths && 'tactile paths',
  ].filter(Boolean)
  return [
    features.length ? `Accessibility: ${features.join(', ')}.` : 'Accessibility: nothing declared.',
    museum.navMeshWheelchair ? 'A step-free route is available ("wheelchair" command).' : '',
    access.notes ? `Accessibility notes: ${access.notes}` : '',
  ].join(' ')
}

/** Human name of the current destination, for directions and their title. */
export function useDestinationName(
  destination: NavigationDestination | null,
  catalog: NavigationCatalogObject[],
  {
    services,
    exitEntrances: exits,
  }: { services: ServiceMarker[]; exitEntrances: ExitEntranceMarker[] },
) {
  const { t } = useTranslation('tour-navigation')
  if (!destination) return ''
  if (destination.kind === 'object') {
    return catalog.find((object) => object.id === destination.id)?.name ?? t('your destination')
  }
  if (destination.kind === 'exit') {
    return exits.find((node) => node.id === destination.target)?.name ?? t('the exit')
  }
  const service = services.find(
    (node) => node.id === destination.target || node.service === destination.target,
  )
  return service?.name ?? t('the service')
}

/**
 * Where the tour cursor stands: the destination (the next stop's work unless
 * the visitor chose `to`) and the author's directions for the stop ahead.
 * `tour` already holds only the stops the visitor can reach: the server drops
 * the unavailable ones where the navigation data is built (`visitableTour`),
 * so the cursor, "Stop N of M" and the progress bar count the same list and
 * there is nothing to skip here.
 */
export function useTourCursor(tour: Tour | null, step: number, catalog: NavigationCatalogObject[]) {
  const search = useSearchParams()
  const tourContents = tour?.contents
  // Route guidance follows the next ordered content unless the visitor chose `to`.
  const defaultDestination = stopObjectId(tourContents?.[step], catalog)
  // Memoized on the destination parameters only, not the whole URL: the map
  // recomputes its path (and the directions restart) when this object
  // changes, and a modal, `?more=` or a reading option must not do that.
  const destinationQuery = new URLSearchParams(
    [...search].filter(([key]) => (DESTINATION_KEYS as string[]).includes(key)),
  ).toString()
  const destination = useMemo<NavigationDestination | null>(
    () =>
      navigationDestination(new URLSearchParams(destinationQuery)) ??
      (defaultDestination ? { kind: 'object', id: defaultDestination } : null),
    [destinationQuery, defaultDestination],
  )
  // The author's directions apply while the route leads to the stop (a
  // destination the visitor chose instead has nothing to do with them).
  const chosen = destinationQuery !== ''
  const notes = useMemo(
    () => (tour && !chosen ? logisticNotes(tour, step) : []),
    [tour, step, chosen],
  )
  return { defaultDestination, destination, notes }
}

/**
 * The header's and footer's heights as root CSS variables. The header varies
 * (title wrap, stepper, free visit): the docked desktop panel (portalled, see
 * NavigationModal) starts just below it instead of covering the stepper. The
 * footer grows with text instead of reserving a fixed-height strip.
 */
export function useMeasuredBars() {
  const { ref: headerRef, height: headerHeight } = useElementSize(BORDER_BOX)
  useRootHeightVariable('--navigation-header-height', headerHeight)
  const { ref: footerRef, height: footerHeight } = useElementSize(BORDER_BOX)
  useRootHeightVariable('--navigation-footer-height', footerHeight)
  return { headerRef, footerRef }
}

/**
 * The tour's contents and works: nearby suggestions skip the tour's own
 * stops (in free navigation every content in the room is worth suggesting).
 */
export function useTourIds(
  tourContents: Tour['contents'] | undefined,
  catalog: NavigationCatalogObject[],
) {
  const tourContentIds = useMemo(
    () => new Set((tourContents ?? []).map((content) => extractID(content))),
    [tourContents],
  )
  const tourObjectIds = useMemo(
    () =>
      new Set(
        (tourContents ?? [])
          .map((content) => stopObjectId(content, catalog))
          .filter((id): id is string => Boolean(id)),
      ),
    [tourContents, catalog],
  )
  return { tourContentIds, tourObjectIds }
}

/**
 * What the directions strip shows instead of steps: without a confirmed
 * position it asks for one instead of giving directions (a route from a
 * guessed entrance would read as real guidance). The first that holds, in
 * this order; none while there are steps to show.
 */
export function directionsStatus(state: {
  complete: boolean
  positioned: boolean
  /** The confirmed position is the destination itself (e.g. a QR scanned at the next stop). */
  atDestination: boolean
  routeUnavailable: boolean
  hasDestination: boolean
  hasSteps: boolean
}): DirectionsStatus | null {
  if (state.complete) return 'complete'
  if (!state.positioned) return 'no-position'
  // There is no way to give from a place to itself: say where the visitor
  // is instead of searching a route forever.
  if (state.atDestination) return 'here'
  if (state.routeUnavailable) return 'unavailable'
  if (!state.hasDestination) return 'no-destination'
  return state.hasSteps ? null : 'loading'
}

/** The destination as a key: the work's id, or the service or exit target. */
export const destinationKey = (destination: NavigationDestination | null) =>
  destination?.kind === 'object' ? destination.id : (destination?.target ?? '')

/** What the voice assistant knows about the visit, in plain English for its prompt. */
export function assistantContext({
  museum,
  tour,
  step,
  destination,
  direction,
  notes,
  guest = false,
}: {
  museum: Museum
  tour: Tour | null
  step: number
  /** The destination's name, null when none is chosen. */
  destination: string | null
  direction: string | null
  notes: string[]
  /** A group guest: the host leads, so stop and destination commands are not offered. */
  guest?: boolean
}) {
  return [
    tour
      ? `Museum: ${museum.name}. Tour: ${tour.title}, stop ${step + 1} of ${tour.contents.length}.`
      : `Museum: ${museum.name}. Free visit, no tour.`,
    destination ? `Heading to: ${destination}.` : 'No destination chosen.',
    direction ? `Current direction: ${direction}.` : '',
    // "How do I get there?", "Where is the cloakroom?": the author's notes.
    notes.length ? `Tour directions: ${notes.join(' ')}` : '',
    // "Are there obstacles?": what the museum declares about access.
    accessibilityContext(museum),
    // Why "avanti" or "dov'è il bagno" are missing for a guest (route.ts).
    guest ? 'Group tour guest: the host leads, guests cannot change stop or destination.' : '',
  ].join(' ')
}

/**
 * What the page reads from the saved map: the parsed scene, its markers
 * (services and entrances/exits live in the scene graph, not in a Payload
 * field) and its rooms and doors (which name the directions; the objects'
 * rooms drive suggestions).
 */
export function useMuseumMapData(map: Museum['map']) {
  return useMemo(() => {
    const nodes = mapNodes(map)
    return {
      museumMap: validateBuildJson(map),
      markers: collectMuseumMarkers(nodes),
      rooms: museumRooms(nodes),
    }
  }, [map])
}

/**
 * Voice guidance: speaks the current step whenever it changes (new route,
 * GPS progress, or the arrows) while `enabled` (turned on, and from a
 * confirmed position: without one the strip asks for it instead). Uses the
 * shell's shared player (also used by modals); stories have no shell.
 */
export function useVoiceGuidance({
  guidance,
  destinationName,
  enabled,
}: {
  guidance: { steps: DirectionStep[]; current: number }
  destinationName: string
  enabled: boolean
}) {
  const sentence = useStepSentence()
  const ownSpeech = useSpeech()
  const speech = useSharedSpeech() ?? ownSpeech
  const currentStep = guidance.steps[guidance.current]
  const spokenStep = currentStep && enabled ? sentence(currentStep, destinationName) : null
  const { speak } = speech
  useEffect(() => {
    if (spokenStep) speak(spokenStep).catch(() => {})
  }, [spokenStep, speak])
  return { sentence, speech, currentStep }
}

/**
 * The page's commands (`navigation-commands.ts`) and the ways it runs them:
 * by id (the map, the assistant, notices), or as the nearby suggestions
 * (`useNearbySuggestions`) that follow the visitor's point.
 */
export function useTourCommands({
  museum,
  scope,
  tours,
  catalog,
  markers,
  nearby,
}: {
  museum: Museum
  scope: NavigationScope
  tours: NavigationTourSummary[]
  catalog: NavigationCatalogObject[]
  markers: { services: ServiceMarker[]; exitEntrances: ExitEntranceMarker[] }
  nearby: {
    enabled: boolean
    notify: boolean
    rooms: MuseumRooms
    point: [number, number] | null
    tourContentIds: Set<string>
  }
}) {
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { commands, run } = useNavigationCommands({
    museum,
    scope,
    tours,
    catalog,
    services: markers.services,
    exits: markers.exitEntrances,
  })
  const commandById = (id: string) => commands.find((command) => command.id === id)
  const runId = (id: string) => {
    const command = commandById(id)
    if (command) run(command)
  }
  // "Set as my position" and "go here": same-page URL state, replaced.
  const setNavigation = (key: 'at' | 'to', id: string) =>
    router.replace(
      withNavigationValue(navigationBasePath(lng, scope), search.toString(), key, id),
      { scroll: false },
    )
  const history = useNearbySuggestions({
    ...nearby,
    catalog,
    onOpen: ({ content }) => runId(`content:${content.id}`),
    onGo: ({ object }) => setNavigation('to', object.id),
  })
  const nearbyCommands = history.flatMap(({ content }) => {
    const command = commandById(`content:${content.id}`)
    return command ? [command] : []
  })
  return { commands, run, runId, nearbyCommands, setNavigation }
}

/**
 * Guidance from the visitor's settings: the GPS fix and compass of the
 * chosen source, and the route guidance anchored at the confirmed work.
 * Where GPS offsets start from (`positionScope`): a new museum, confirmed
 * work or GPS source resets it (the guidance anchor, and the proximity
 * notice's state). Identification also works before a destination is chosen.
 */
export function useGuidance({
  museumId,
  currentObjectId,
  rooms,
  route,
  navMesh,
}: {
  museumId: string
  currentObjectId: string | null
  rooms: MuseumRooms
  route: MuseumRoute | null
  /** The navmesh the route uses: the live position stays on it. */
  navMesh: NavMesh | null
}) {
  const settings = useGuidanceSettings()
  const gps = useGpsFix(settings.gpsMode)
  const compass = useCompass(settings.gpsMode)
  const positionScope = `${museumId}:${currentObjectId}:${settings.gpsMode}`
  const guidance = useRouteGuidance({
    route,
    rooms,
    fix: gps.fix,
    startPoint: rooms.objects.find(({ objectId }) => objectId === currentObjectId)?.point,
    anchorScope: positionScope,
    navMesh,
  })
  // Nearby suggestions follow the GPS estimate, or else the confirmed start.
  const here =
    guidance.estimate ??
    (route?.start ? ([route.start[0], route.start[2]] as [number, number]) : null)
  return { settings, gps, compass, positionScope, guidance, here }
}
