'use client'

import { NavigationAssistant } from '@/components/assistant/NavigationAssistant'
import { Museum, Tour } from '@/payload-types'
import { AppShellFooter, AppShellMain, AppShellMainProps, Box, Button, Group } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { prewarmQrScanner } from '@/lib/qr-scanner-module'
import { Suspense, useEffect, useState, type ReactNode, type Ref } from 'react'
import { MuseumMap, type MuseumRoute } from './MuseumMap'
import { NavigationControls } from './NavigationControls'
import { NavigationHeader } from './NavigationHeader'
import {
  assistantContext,
  destinationKey,
  directionsStatus,
  useDestinationName,
  useMeasuredBars,
  useMuseumMapData,
  useTourCursor,
  useGuidance,
  useTourCommands,
  useTourIds,
  useVoiceGuidance,
} from './use-tour-navigation'
import { SkippedStopModal } from './SkippedStopModal'
import { DirectionsBar, type DirectionsStatus } from './DirectionsBar'
import type { NavigationCommand } from './navigation-commands'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { NavigationProximity } from './NavigationProximity'
import { NAVIGATION_ACTION_CLASS } from './navigation-touch'
import classes from './navigation-desktop.module.css'
import {
  tourAdvanceHref,
  tourHasQuiz as hasQuiz,
  tourQuizPath,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import type { NavigationTourSummary } from './TourNavigationShell'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/** The tour (with its cursor) the map follows, or free navigation of the museum. */
export type NavigationPageScope =
  { kind: 'tour'; tour: Tour; step: number } | { kind: 'free'; museumId: string }

/**
 * Composes the map, search, scan, and route guidance: step-by-step directions
 * in the navbar, optional GPS progress, nearby suggestions, and the opt-in
 * voice assistant (the orb). Search, pills and the assistant all run the same
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
  // The scanner (`…/scan`) covers the whole map with the camera: pause the map's frames meanwhile.
  const scanning = /\/scan$/.test(usePathname())
  // "Scan" is one tap away: load the scanner's code while the visitor looks at
  // the map, not after the tap (src/lib/qr-scanner-module.ts).
  useEffect(prewarmQrScanner, [])
  const { museumMap, markers, rooms } = useMuseumMapData(museum.map)

  const { t } = useTranslation('tour-navigation')
  const [routeUnavailable, setRouteUnavailable] = useState(false)
  const [route, setRoute] = useState<MuseumRoute | null>(null)
  // The map resolves which entrance the route starts from (it owns the navmesh);
  // the progress bar mirrors that choice as its leading step.
  const [startEntranceId, setStartEntranceId] = useState<string | null>(null)
  const { skipped, skipTo, stepSkipped, defaultDestination, destination, notes } = useTourCursor(
    tour,
    step,
    catalog,
    museumMap.parsed,
  )
  // The work the route leads to, if it is one (not a service or an exit).
  const nextObjectId = destination?.kind === 'object' ? destination.id : null
  const currentObjectId = search.get('at')
  // With a confirmed position the visitor's own start replaces the entrance step.
  const startEntrance =
    !currentObjectId && markers.exitEntrances.find((node) => node.id === startEntranceId)
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
  const destinationName = useDestinationName(destination, catalog, markers)
  const { headerRef, footerRef } = useMeasuredBars()

  const { tourContentIds, tourObjectIds } = useTourIds(tour?.contents, catalog)
  const { commands, run, runId, nearbyCommands, setNavigation } = useTourCommands({
    museum,
    scope,
    tours,
    catalog,
    markers,
    // "Open next stop" would open a stop that can't be visited: the skip
    // modal is the way on instead.
    withoutNextStop: stepSkipped,
    nearby: {
      enabled: settings.suggestions,
      notify: settings.gpsMode === 'off',
      rooms,
      point: here,
      tourContentIds,
    },
  })

  // GPS notices about the works around. A guessed entrance is never treated
  // as the visitor's position; group guests keep following the host,
  // including `at`.
  const proximity = !guest && !scanning && currentObjectId && settings.gpsMode !== 'off' && (
    <NavigationProximity
      point={guidance.estimate}
      heading={compass.heading}
      rooms={rooms}
      catalog={catalog}
      nextId={nextObjectId}
      tourObjectIds={tourObjectIds}
      discoveries={settings.suggestions}
      scopeKey={`${positionScope}:${destinationKey(destination)}`}
      onOpen={(id) => runId(`object:${id}`)}
      onConfirm={(id) => setNavigation('at', id)}
    />
  )

  return (
    <>
      {tour && stepSkipped && (
        <TourSkipModal tour={tour} step={step} skipTo={skipTo} guest={guest} />
      )}
      <NavigationHeader
        ref={headerRef}
        tour={tour}
        step={step}
        museumName={museum.name}
        stopObjectId={defaultDestination}
        rooms={rooms}
        skipped={skipped}
        entranceLabel={startEntrance ? (startEntrance.name ?? t('Entrance')) : null}
        notes={notes}
      />

      <NavigationStage
        map={
          museumMap.parsed && (
            <MuseumMap
              map={museumMap.parsed}
              h="100%"
              w="100%"
              renderPaused={scanning}
              navMesh={navMesh}
              currentObjectId={currentObjectId}
              destination={destination}
              onRouteUnavailable={setRouteUnavailable}
              onStartEntranceChange={setStartEntranceId}
              onRouteChange={setRoute}
              position={guidance.position}
              path={guidance.path}
              onObjectClick={(id) => runId(`object:${id}`)}
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
        status={directionsStatus({
          complete,
          positioned: Boolean(currentObjectId),
          routeUnavailable,
          hasDestination: Boolean(destination),
          hasSteps: guidance.steps.length > 0,
        })}
        // A completed tour with a quiz offers it right where "Tour completed" shows.
        action={
          tour && complete && hasQuiz(tour) && !guest && <QuizAction tour={tour} step={step} />
        }
        voiceGuidance={settings.voiceGuidance && Boolean(currentObjectId)}
      />
    </>
  )
}

/**
 * The map and, over it, the floating controls: only the space between the
 * measured bars belongs to them.
 */
function NavigationStage({ map, controls }: { map: ReactNode; controls: ReactNode }) {
  const { t } = useTranslation('tour-navigation')
  return (
    <AppShellMain h="100dvh" className="overflow-hidden pb-[var(--navigation-footer-height,4rem)]">
      <Box pos="relative" h="100%">
        <Suspense fallback={<Box>{t('Loading map')}</Box>}>
          {map || <Box>{t('Map not available')}</Box>}
        </Suspense>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--navigation-header-height,7rem)] min-h-0">
          {controls}
        </div>
      </Box>
    </AppShellMain>
  )
}

/**
 * The directions strip: the steps (or the status that replaces them) and the
 * voice assistant's orb. It uses the remaining width; the orb keeps its
 * intrinsic target size instead of reserving a fifth of a narrow screen, and
 * active guidance places the orb beside its arrows at enlarged text, leaving
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
}) {
  const { lng } = useParams<{ lng: string }>()
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
          />
        </Box>
      </Group>
    </AppShellFooter>
  )
}

/** Stops the visitor can't reach between the cursor and `skipTo`, skipped together. */
function TourSkipModal({
  tour,
  step,
  skipTo,
  guest,
}: {
  tour: Tour
  step: number
  skipTo: number
  guest: boolean
}) {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const router = useRouter()
  return (
    <SkippedStopModal
      titles={tour.contents
        .slice(step, skipTo)
        .map((content, index) =>
          typeof content === 'object'
            ? content.title
            : t('Stop {{number}}', { number: step + index + 1 }),
        )}
      completes={skipTo === tour.contents.length}
      guest={guest}
      onSkip={() => {
        // Same advance as the step modal: the quiz when it ends the tour.
        const { href, quiz } = tourAdvanceHref(lng, tour, skipTo, search.toString())
        if (quiz) router.push(href)
        else router.replace(href, { scroll: false })
      }}
    />
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
