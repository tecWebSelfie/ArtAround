'use client'

import { NavigationAssistant } from '@/components/assistant/NavigationAssistant'
import { Museum, Tour } from '@/payload-types'
import { AppShellFooter, AppShellMain, AppShellMainProps, Box, Button, Group } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { useMergedRef } from '@mantine/hooks'
import { useNamedEntrances } from '@/hooks/use-named-entrances'
import { prewarmQrScanner } from '@/lib/qr-scanner-module'
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react'
import { MuseumMap, type MuseumRoute } from './MuseumMap'
import { NavigationControls } from './NavigationControls'
import { NavigationHeader } from './NavigationHeader'
import {
  assistantContext,
  destinationKey,
  directionsStatus,
  useDestinationName,
  useFlagLabel,
  useMeasuredBars,
  useMuseumMapData,
  usePositionPrompt,
  useTourCursor,
  useTourEntrance,
  useGuidance,
  useTourCommands,
  useTourIds,
  useVoiceGuidance,
} from './use-tour-navigation'
import { MuseumFloorplan } from '@/components/pascal/MuseumFloorplan'
import { DirectionsBar, type DirectionsStatus } from './DirectionsBar'
import type { NavigationCommand } from './navigation-commands'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { NavigationProximity } from './NavigationProximity'
import { RemovedStopsModal } from './RemovedStopsModal'
import { NAVIGATION_ACTION_CLASS } from './navigation-touch'
import classes from './navigation-desktop.module.css'
import {
  tourHasQuiz as hasQuiz,
  tourQuizPath,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import type { NavigationTourSummary } from './TourNavigationShell'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/** Mantine's `md`, where contextual modals dock as a side panel (navigation-desktop.module.css). */
const DOCKED_PANEL_FROM = '62em'

/**
 * The open panel docked on the right, if any: from md a work, content or stop
 * opens as a panel over the map (NavigationModal); below md it is a full dialog.
 */
const dockedPanel = () =>
  window.matchMedia(`(min-width: ${DOCKED_PANEL_FROM})`).matches
    ? document.querySelector(`.${classes.panelInner} > *`)
    : null

/** The tour (with its cursor) the map follows, or free navigation of the museum. */
export type NavigationPageScope =
  { kind: 'tour'; tour: Tour; step: number } | { kind: 'free'; museumId: string }

/**
 * Composes the map, search, scan, and route guidance: step-by-step directions
 * in the navbar, optional GPS progress, nearby suggestions, and the opt-in
 * voice assistant (the microphone button). Search, pills and the assistant all run the same
 * URL commands (`navigation-commands.ts`).
 *
 * In a tour it adds the ordered progress, the next stop as the default
 * destination, and the quiz. In free navigation (`scope.kind === 'free'`) the
 * header names the museum, there is no default destination, and the Spotlight
 * also lists the museum's tours to start one from here.
 *
 * From md up (desktop, kiosks, remote visits) the same pieces recompose for a
 * wide screen (`navigation-desktop.module.css`): the header content is capped
 * and centred, the floating controls gather bottom-left, the directions strip
 * keeps a bounded width, and contextual modals dock on the right below the
 * header, whose height this component publishes for them.
 */
export const TourNavigationPage = ({
  scope,
  museum,
  catalog,
  tours = [],
}: {
  scope: NavigationPageScope
  museum: Museum
  catalog: NavigationCatalogObject[]
  tours?: NavigationTourSummary[]
} & Omit<AppShellMainProps, 'step'>) => {
  const tour = scope.kind === 'tour' ? scope.tour : null
  const step = scope.kind === 'tour' ? scope.step : 0
  // URL state stays in the URL; this component reads it where map behavior needs it.
  const search = useSearchParams()
  // "Scan" is one tap away: load the scanner's code while the visitor looks at
  // the map, not after the tap (src/lib/qr-scanner-module.ts).
  useEffect(prewarmQrScanner, [])
  const { museumMap, markers, rooms } = useMuseumMapData(museum.map)

  const [routeUnavailable, setRouteUnavailable] = useState(false)
  const [route, setRoute] = useState<MuseumRoute | null>(null)
  const { defaultDestination, destination, notes } = useTourCursor(tour, step, catalog)
  // In a tour, heading to its next stop (not somewhere the visitor chose).
  const onTourRoute =
    tour !== null && destination?.kind === 'object' && destination.id === defaultDestination
  // The work the route leads to, if it is one (not a service or an exit).
  const nextObjectId = destination?.kind === 'object' ? destination.id : null
  // A work's id, or an entrance's node id when the visitor said they stand there.
  const currentObjectId = search.get('at')
  // Positioned once the map resolved `at` to a work or an entrance on it (an
  // `at` naming nothing there, e.g. an entrance since removed, is no
  // position: the map shows a guess, so the strip asks again). Without a
  // resolved route yet (or a museum with no map) the URL is all there is.
  const positioned = route ? route.confirmed : Boolean(currentObjectId)
  const entrances = useNamedEntrances(markers.exitEntrances)
  const { tourEntrance, previewEntranceId } = useTourEntrance({
    tour,
    step,
    catalog,
    map: museum.map,
    onTourRoute,
  })
  const tourEntranceName = entrances.find((entrance) => entrance.id === tourEntrance?.id)?.name
  // A stale/shared wheelchair URL still uses the standard mesh when this
  // museum has no wheelchair-specific mesh saved.
  const wheelchairRoute =
    Boolean(museum.navMeshWheelchair) && search.get('mobility') === 'wheelchair'
  const complete = tour !== null && step === tour.contents.length
  // Group guests follow the host, who leads them into the quiz too.
  const guest = useIsGroupGuest()

  const navMesh = (wheelchairRoute ? museum.navMeshWheelchair : museum.navMesh) ?? null
  const { settings, gps, compass, positionScope, guidance, here } = useGuidance({
    museumId: museum.id,
    currentObjectId,
    rooms,
    route,
    navMesh,
  })
  // The plan needs a map to draw: without one the view stays 3D.
  const planView = settings.mapView === '2d' && Boolean(museumMap.parsed)
  const destinationName = useDestinationName(destination, catalog, markers)
  const { headerRef, footerRef } = useMeasuredBars()
  // The UI over the map, which the camera keeps the journey clear of.
  const header = useRef<HTMLElement>(null)
  const controlsRow = useRef<HTMLDivElement>(null)
  const overlays = useMemo(
    () => ({
      top: header,
      bottom: controlsRow,
      right: dockedPanel,
    }),
    [],
  )
  const measuredHeaderRef = useMergedRef(headerRef, header)

  const destinationLabel = useFlagLabel({
    destination,
    catalog,
    markers,
    // The flag marks the tour's next stop: it carries the stop's number.
    stop: onTourRoute && !complete ? step + 1 : null,
  })
  const { tourContentIds, tourObjectIds } = useTourIds(tour?.contents, catalog)
  const { commands, run, runId, nearbyCommands, setNavigation } = useTourCommands({
    museum,
    scope,
    tours,
    catalog,
    markers,
    nearby: {
      enabled: settings.suggestions,
      notify: settings.gpsMode === 'off',
      rooms,
      point: here,
      tourContentIds,
    },
  })

  const positionPrompt = usePositionPrompt({
    museumId: museum.id,
    entrances,
    guest,
    onEntrance: (id) => setNavigation('at', id),
    onScan: () => runId('scan'),
  })
  const status = directionsStatus({
    complete,
    positioned,
    // Only while there is no way back to give: once the visitor walks
    // away, directions lead them back to it.
    atDestination: positioned && currentObjectId === nextObjectId && guidance.steps.length === 0,
    routeUnavailable,
    hasDestination: Boolean(destination),
    hasSteps: guidance.steps.length > 0,
  })
  // "Where are you?" is opened in the strip: it carries scan and search, so
  // the map's controls leave them out instead of offering them twice.
  const asking = status === 'no-position' && Boolean(positionPrompt?.opened)

  // GPS notices about the works around. A guessed entrance is never treated
  // as the visitor's position; group guests keep following the host,
  // including `at`.
  const proximity = !guest && positioned && currentObjectId && settings.gpsMode !== 'off' && (
    <NavigationProximity
      point={guidance.estimate}
      heading={compass.heading}
      rooms={rooms}
      catalog={catalog}
      nextId={nextObjectId}
      currentId={currentObjectId}
      tourObjectIds={tourObjectIds}
      discoveries={settings.suggestions}
      scopeKey={`${positionScope}:${destinationKey(destination)}`}
      onOpen={(id) => runId(`object:${id}`)}
      onConfirm={(id) => setNavigation('at', id)}
    />
  )

  return (
    <>
      <NavigationHeader
        ref={measuredHeaderRef}
        tour={tour}
        step={step}
        museumName={museum.name}
        stopObjectId={defaultDestination}
        rooms={rooms}
        entranceLabel={tourEntranceName ?? null}
        notes={notes}
      />

      {/* Stops that stopped being visitable while this tab followed the tour. */}
      {tour && <RemovedStopsModal tour={tour} step={step} />}

      <NavigationStage
        map={
          museumMap.parsed && (
            <MuseumMap
              map={museumMap.parsed}
              h="100%"
              w="100%"
              navMesh={navMesh}
              currentObjectId={currentObjectId}
              destination={destination}
              onRouteUnavailable={setRouteUnavailable}
              onRouteChange={setRoute}
              position={guidance.position}
              path={guidance.path}
              destinationLabel={destinationLabel}
              overlays={overlays}
              previewEntranceId={previewEntranceId}
              onObjectClick={(id) => runId(`object:${id}`)}
              // Under the floor plan the 3D map stays mounted (routes are
              // computed on its meshes) but draws no frames, and is hidden
              // with its DOM labels, which would float over the plan.
              renderPaused={planView}
              className={planView ? 'invisible' : undefined}
            />
          )
        }
        plan={
          planView &&
          museumMap.parsed && (
            <MuseumFloorplan
              // As on the 3D map: the avatar waits at the route's start.
              position={guidance.position ?? route?.start ?? null}
              path={guidance.path ?? route?.path ?? null}
              // A guessed start (no start at all draws no visitor disc).
              estimated={route?.confirmed === false}
              catalog={catalog}
              roots={museumMap.parsed.rootNodeIds}
            />
          )
        }
        controls={
          <NavigationControls
            museum={museum}
            commands={commands}
            nearby={nearbyCommands}
            onRun={run}
            services={markers.services}
            exits={markers.exitEntrances}
            sensors={{ settings, gps, compass, walk: guidance.walk }}
            proximity={proximity}
            planAvailable={Boolean(museumMap.parsed)}
            asking={asking}
            bottomRowRef={controlsRow}
          />
        }
      />

      <NavigationFooter
        ref={footerRef}
        museum={museum}
        tour={tour}
        step={step}
        notes={notes}
        guidance={guidance}
        destination={destination && destinationName}
        settings={settings}
        commands={commands}
        onCommand={runId}
        status={status}
        // A completed tour with a quiz offers it right where "Tour completed" shows.
        action={
          tour && complete && hasQuiz(tour) && !guest && <QuizAction tour={tour} step={step} />
        }
        voiceGuidance={settings.voiceGuidance && positioned}
        positionPrompt={positionPrompt}
      />
    </>
  )
}

/**
 * The map and, over it, the floating controls: only the space between the
 * measured bars belongs to them.
 */
function NavigationStage({
  map,
  plan,
  controls,
}: {
  map: ReactNode
  /** Pascal's 2D floor plan, drawn over the (paused) 3D map when chosen. */
  plan: ReactNode
  controls: ReactNode
}) {
  const { t } = useTranslation('tour-navigation')
  return (
    <AppShellMain h="100dvh" className="overflow-hidden pb-[var(--navigation-footer-height,4rem)]">
      <Box pos="relative" h="100%">
        <Suspense fallback={<Box>{t('Loading map')}</Box>}>
          {map || <Box>{t('Map not available')}</Box>}
        </Suspense>
        {plan}
        {/* z-20: above the map's DOM labels (room names, "You", z ≤ 10 via
            drei's `zIndexRange`), below the app shell's bars (z 100), so a
            notice or a control is never crossed by a label. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--navigation-header-height,7rem)] z-20 min-h-0">
          {controls}
        </div>
      </Box>
    </AppShellMain>
  )
}

/**
 * The directions strip: the steps (or the status that replaces them) and the
 * voice assistant's button. It uses the remaining width; the button keeps its
 * intrinsic target size instead of reserving a fifth of a narrow screen, and
 * active guidance places the button beside its arrows at enlarged text, leaving
 * the entire footer width for the sentence. Voice guidance speaks each step
 * from here.
 */
function NavigationFooter({
  ref,
  museum,
  tour,
  step,
  notes,
  guidance,
  destination,
  settings,
  commands,
  onCommand,
  status,
  action,
  voiceGuidance,
  positionPrompt,
}: {
  ref: Ref<HTMLElement>
  museum: Museum
  tour: Tour | null
  step: number
  notes: string[]
  guidance: ReturnType<typeof useGuidance>['guidance']
  /** The destination's name, empty or null when none is chosen. */
  destination: string | null | false
  settings: ReturnType<typeof useGuidance>['settings']
  commands: NavigationCommand[]
  onCommand: (id: string) => void
  status: DirectionsStatus | null
  action: ReactNode
  voiceGuidance: boolean
  positionPrompt: ComponentProps<typeof DirectionsBar>['positionPrompt']
}) {
  const { lng } = useParams<{ lng: string }>()
  const guest = useIsGroupGuest()
  const destinationName = destination || ''
  const { sentence, speech, currentStep } = useVoiceGuidance({
    guidance,
    destinationName,
    enabled: voiceGuidance,
  })
  const assistant = (
    <Group className="ml-auto shrink-0" justify="end">
      <NavigationAssistant
        enabled={settings.assistant}
        onEnable={() => settings.setAssistant(true)}
        commands={commands.map(({ id, label, description }) => ({ id, label, description }))}
        context={assistantContext({
          museum,
          tour,
          step,
          destination: destination || null,
          direction: currentStep ? sentence(currentStep, destinationName) : null,
          notes,
          guest,
        })}
        language={lng}
        speech={speech}
        onCommand={onCommand}
      />
    </Group>
  )
  return (
    <AppShellFooter ref={ref} className="h-auto rounded-t-md">
      <Group className="min-h-16 py-1" px="xs" gap="xs" align="center">
        <Box className={`min-w-0 basis-64 grow ${classes.directions}`}>
          <DirectionsBar
            trailingControl={assistant}
            steps={guidance.steps}
            current={guidance.current}
            onCurrentChange={guidance.setCurrent}
            destination={destinationName}
            status={status}
            // Search lists the museum's objects; each one's modal offers
            // "set as my position" and "go here".
            onSearch={spotlight.open}
            action={action}
            positionPrompt={positionPrompt}
          />
        </Box>
      </Group>
    </AppShellFooter>
  )
}

/** A completed tour with a quiz offers it right where "Tour completed" shows. */
function QuizAction({ tour, step }: { tour: Tour; step: number }) {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  return (
    <Button
      size="sm"
      className={NAVIGATION_ACTION_CLASS}
      color="museum.8"
      autoContrast
      component={Link}
      href={tourQuizPath(lng, tour.id, step, search.toString())}
    >
      {t('Take the quiz')}
    </Button>
  )
}
