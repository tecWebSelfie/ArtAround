'use client'

import { NavigationAssistant } from '@/components/assistant/NavigationAssistant'
import { useSharedSpeech } from '@/components/assistant/speech-context'
import { useSpeech } from '@/components/assistant/use-speech'
import { Museum, Tour } from '@/payload-types'
import {
  ActionIcon,
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellMainProps,
  Box,
  Button,
  Group,
  Kbd,
  Progress,
  Stack,
  Text,
  Title,
  Tooltip,
  useMatches,
} from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { ACCESSIBILITY_COLOR } from '@/theme'
import { validateBuildJson } from '@pascal-app/core'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import {
  collectMuseumMarkers,
  mapNodes,
  type ExitEntranceMarker,
  type ServiceMarker,
} from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import { prewarmQrScanner } from '@/lib/qr-scanner-module'
import { museumRooms, roomAt } from '@/lib/museum-rooms'
import { formatUnit, toMinutes } from '@/lib/duration'
import { Accessibility, DoorOpen, ScanQrCode, Search, X } from 'lucide-react'
import { useElementSize } from '@mantine/hooks'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { MuseumMap, type MuseumRoute } from './MuseumMap'
import { TourProgress } from './TourProgress'
import { LogisticNotes } from './LogisticNotes'
import { logisticNotes } from '@/lib/tour-logistics'
import { SkippedStopModal } from './SkippedStopModal'
import { DirectionsBar, useStepSentence, type DirectionsStatus } from './DirectionsBar'
import { GroupBadge } from '@/components/group/GroupBadge'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { GuidanceSettings, useGuidanceSettings } from './GuidanceSettings'
import { GpsSimulator } from './GpsSimulator'
import { useGpsFix } from './gps-source'
import { useCompass } from './compass-source'
import { NavigationProximity } from './NavigationProximity'
import { NavigationSpotlight } from './NavigationSpotlight'
import { NavigationServices, type NavigationServiceAction } from './NavigationServices'
import { NAVIGATION_ACTION_CLASS } from './navigation-touch'
import classes from './navigation-desktop.module.css'
import { useNavigationCommands, type NavigationCommand } from './navigation-commands'
import { useNearbySuggestions } from './use-nearby-suggestions'
import { useRouteGuidance } from './use-route-guidance'
import {
  navigationBasePath,
  navigationDestination,
  nextVisitableStep,
  placedObjectIds,
  stopObjectId,
  tourAdvanceHref,
  tourHasQuiz as hasQuiz,
  tourQuizPath,
  unavailableStops,
  withNavigationValue,
  type NavigationCatalogObject,
  type NavigationDestination,
} from '@/lib/tour-navigation'
import type { NavigationTourSummary } from './TourNavigationShell'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

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
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  // The scanner (`…/scan`) covers the whole map with the camera: pause the map's frames meanwhile.
  const scanning = /\/scan$/.test(usePathname())
  // "Scan" is one tap away: load the scanner's code while the visitor looks at
  // the map, not after the tap (src/lib/qr-scanner-module.ts).
  useEffect(prewarmQrScanner, [])
  const museumMap = useMemo(() => validateBuildJson(museum.map), [museum.map])
  // Services and entrances/exits live in the saved map scene graph, not in a
  // Payload field, so the controls derive them from the same JSON the map loads.
  const markers = useMemo(() => collectMuseumMarkers(mapNodes(museum.map)), [museum.map])
  // Rooms and doors name the directions; objects' rooms drive suggestions.
  const rooms = useMemo(() => museumRooms(mapNodes(museum.map)), [museum.map])
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const [routeUnavailable, setRouteUnavailable] = useState(false)
  const [route, setRoute] = useState<MuseumRoute | null>(null)
  // The map resolves which entrance the route starts from (it owns the navmesh);
  // the progress bar mirrors that choice as its leading step.
  const [startEntranceId, setStartEntranceId] = useState<string | null>(null)
  const next = tour?.contents[step]
  // Route guidance follows the next ordered content unless the visitor chose `to`.
  const defaultDestination = stopObjectId(next, catalog)
  // Stops the visitor can no longer reach (content gone, or its object left
  // the map): flagged in the progress bar, and skipped through a modal when
  // the cursor reaches them (see `unavailableStops`).
  const tourContents = tour?.contents
  const skipped = useMemo(
    () =>
      // No map at all is its own state ("Map not available"): nothing to skip.
      tourContents && museumMap.parsed
        ? unavailableStops(tourContents, catalog, placedObjectIds(museumMap.parsed))
        : new Set<number>(),
    [tourContents, catalog, museumMap.parsed],
  )
  const skipTo = tour ? nextVisitableStep(step, tour.contents.length, skipped) : step
  const stepSkipped = skipTo > step
  const destination = useMemo<NavigationDestination | null>(
    () =>
      navigationDestination(search) ??
      (defaultDestination ? { kind: 'object', id: defaultDestination } : null),
    [search, defaultDestination],
  )
  // The work the route leads to, if it is one (not a service or an exit).
  const nextObjectId = destination?.kind === 'object' ? destination.id : null
  // The author's directions for the stop ahead, while the route leads to it
  // (a destination the visitor chose instead has nothing to do with them).
  const notes = useMemo(
    () => (tour && !navigationDestination(search) ? logisticNotes(tour, step) : []),
    [tour, step, search],
  )
  const currentObjectId = search.get('at')
  // With a confirmed position the visitor's own start replaces the entrance step.
  const startEntrance = currentObjectId
    ? null
    : (markers.exitEntrances.find((node) => node.id === startEntranceId) ?? null)
  // A stale/shared wheelchair URL still uses the standard mesh when this
  // museum has no wheelchair-specific mesh saved.
  const wheelchairRoute =
    Boolean(museum.navMeshWheelchair) && search.get('mobility') === 'wheelchair'
  const complete = tour !== null && step === tour.contents.length
  // "Stop 3 of 14 · Room 6 · 25 min left": where the visitor is in the tour,
  // where the next work hangs and how long the rest takes (the remaining
  // stops' lengths, the only duration the data carries). Parts the data
  // can't support are left out.
  const position = useMemo(() => {
    if (!tour) return ''
    if (step >= tour.contents.length)
      return t('All {{count}} stops visited', { count: tour.contents.length })
    const point = rooms.objects.find(({ objectId }) => objectId === defaultDestination)?.point
    const room = point ? roomAt(rooms.rooms, point)?.name : null
    const seconds = tour.contents
      .slice(step)
      .reduce(
        (sum, content) => sum + (typeof content === 'object' ? (content.durationSeconds ?? 0) : 0),
        0,
      )
    return [
      t('Stop {{number}} of {{count}}', { number: step + 1, count: tour.contents.length }),
      room,
      seconds
        ? t('{{duration}} of reading left', {
            duration: formatUnit(toMinutes(seconds), 'minute', lng),
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [tour, step, rooms, defaultDestination, t, lng])
  // Group guests follow the host, who leads them into the quiz too.
  const guest = useIsGroupGuest()

  const settings = useGuidanceSettings()
  const gps = useGpsFix(settings.gpsMode)
  const compass = useCompass(settings.gpsMode)
  const confirmedPoint = rooms.objects.find(({ objectId }) => objectId === currentObjectId)?.point
  // Where GPS offsets start from: a new museum, confirmed work or GPS source
  // resets it (the guidance anchor, and the proximity notice's state).
  const positionScope = `${museum.id}:${currentObjectId}:${settings.gpsMode}`
  // Identification also works before selecting a destination in a free visit.
  const guidance = useRouteGuidance({
    route,
    rooms,
    fix: gps.fix,
    startPoint: confirmedPoint,
    anchorScope: positionScope,
  })
  const { commands: allCommands, run } = useNavigationCommands({
    museum,
    scope,
    tours,
    catalog,
    services: markers.services,
    exits: markers.exitEntrances,
  })
  // "Open next stop" would open a stop that can't be visited: the skip modal
  // is the way on instead.
  const commands = stepSkipped
    ? allCommands.filter((command) => command.id !== 'next-stop')
    : allCommands
  const destinationName = useDestinationName(
    destination,
    catalog,
    markers.services,
    markers.exitEntrances,
  )
  const sentence = useStepSentence()
  // The shell's shared player (also used by modals); stories have no shell.
  const ownSpeech = useSpeech()
  const speech = useSharedSpeech() ?? ownSpeech

  // Voice guidance: speak a step whenever it changes (new route, GPS
  // progress, or the arrows), only while the visitor has turned it on, and
  // only from a confirmed position: without one the strip asks for it instead.
  const currentStep = guidance.steps[guidance.current]
  const spokenStep =
    currentStep && settings.voiceGuidance && currentObjectId
      ? sentence(currentStep, destinationName)
      : null
  const { speak } = speech
  useEffect(() => {
    if (spokenStep) speak(spokenStep).catch(() => {})
  }, [spokenStep, speak])

  // The header's height varies (title wrap, stepper, free visit): publish it
  // so the docked desktop panel (portalled, see NavigationModal) starts just
  // below it instead of covering the stepper.
  const { ref: headerRef, height: headerHeight } = useElementSize(BORDER_BOX)
  useRootHeightVariable('--navigation-header-height', headerHeight)
  // The footer grows with text instead of reserving a fixed-height strip.
  const { ref: footerRef, height: footerHeight } = useElementSize(BORDER_BOX)
  useRootHeightVariable('--navigation-footer-height', footerHeight)

  // Nearby suggestions follow the GPS estimate, or else the confirmed start.
  const here =
    guidance.estimate ??
    (route?.start ? ([route.start[0], route.start[2]] as [number, number]) : null)
  // Nearby suggestions skip the tour's own stops; in free navigation every
  // content in the room is worth suggesting.
  const tourContentIds = useMemo(
    () =>
      new Set(
        (tourContents ?? []).map((content) => (typeof content === 'string' ? content : content.id)),
      ),
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
  const commandById = (id: string) => commands.find((command) => command.id === id)
  const nearbyHistory = useNearbySuggestions({
    enabled: settings.suggestions,
    notify: settings.gpsMode === 'off',
    rooms,
    point: here,
    catalog,
    tourContentIds,
    onOpen: ({ content }) => {
      const command = commandById(`content:${content.id}`)
      if (command) run(command)
    },
    onGo: ({ object }) =>
      router.replace(
        withNavigationValue(navigationBasePath(lng, scope), search.toString(), 'to', object.id),
        { scroll: false },
      ),
  })
  const nearbyCommands = nearbyHistory.flatMap(({ content }) => {
    const command = commandById(`content:${content.id}`)
    return command ? [command] : []
  })

  // Without a confirmed position the strip asks for one instead of giving
  // directions: a route from a guessed entrance would read as real guidance.
  const status: DirectionsStatus | null = complete
    ? 'complete'
    : !currentObjectId
      ? 'no-position'
      : routeUnavailable
        ? 'unavailable'
        : !destination
          ? 'no-destination'
          : guidance.steps.length === 0
            ? 'loading'
            : null

  // Active guidance shares its lower control row with the assistant, leaving
  // the entire footer width for the sentence when text is enlarged.
  const assistant = (
    <Group className="ml-auto shrink-0" justify="end">
      <NavigationAssistant
        enabled={settings.assistant}
        onEnable={() => settings.setAssistant(true)}
        commands={commands.map(({ id, label, description }) => ({ id, label, description }))}
        context={[
          tour
            ? `Museum: ${museum.name}. Tour: ${tour.title}, stop ${step + 1} of ${tour.contents.length}.`
            : `Museum: ${museum.name}. Free visit, no tour.`,
          destination ? `Heading to: ${destinationName}.` : 'No destination chosen.',
          currentStep ? `Current direction: ${sentence(currentStep, destinationName)}.` : '',
          // "How do I get there?", "Where is the cloakroom?": the author's notes.
          notes.length ? `Tour directions: ${notes.join(' ')}` : '',
          // "Are there obstacles?": what the museum declares about access.
          accessibilityContext(museum),
        ].join(' ')}
        language={lng}
        speech={speech}
        onCommand={(id) => {
          const command = commandById(id)
          if (command) run(command)
        }}
      />
    </Group>
  )

  return (
    <>
      {tour && stepSkipped && (
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
      )}
      <AppShellHeader ref={headerRef} px="xs" pb="xs" className="rounded-b-xl">
        {tour ? (
          // Desktop: one centred column (the brief's 1200px container) so the
          // progress bar and stepper don't stretch across a 1920px screen.
          <Stack gap="xs" maw={{ md: '75rem' }} mx={{ md: 'auto' }}>
            {/* In a group, the pill beside the title opens the group panel
                (GroupBadge). The trailing X leaves the tour for its page: the visit
                can be resumed from the same URL, so leaving needs no confirm. */}
            {/* Three columns, the outer two equal: the title stays centred on
                the screen whatever the X's size. */}
            <div className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-(--mantine-spacing-xs)">
              {/* Left column empty: the floating site logo sits there. */}
              <span aria-hidden />
              <Stack gap={0} align="center" className="min-w-0">
                <Group justify="center" gap="xs" wrap="nowrap">
                  <Title size="h5" ta="center" lineClamp={1}>
                    {tour.title}
                  </Title>
                  <GroupBadge />
                </Group>
                <Text size="xs" c="dimmed" ta="center">
                  {position}
                </Text>
              </Stack>
              <ActionIcon
                component={Link}
                href={`/${lng}/tour/${tour.id}` as Route}
                variant="subtle"
                color="gray"
                size="lg"
                className="justify-self-end"
                aria-label={t('Leave the tour')}
              >
                <X size={18} aria-hidden />
              </ActionIcon>
            </div>
            <Progress
              aria-label={t('Tour progress')}
              size="xs"
              value={tour.contents.length ? (step / tour.contents.length) * 100 : 100}
            />
            <TourProgress
              contents={tour.contents}
              step={step}
              skipped={skipped}
              entranceLabel={startEntrance ? (startEntrance.name ?? t('Entrance')) : null}
              hasQuiz={hasQuiz(tour)}
            />
            <LogisticNotes notes={notes} />
          </Stack>
        ) : (
          // Free navigation: no progress to show, only where the visitor is.
          <Stack gap={0} align="center" pt="xs">
            <Title size="h5" ta="center">
              {museum.name}
            </Title>
            <Text size="xs" c="dimmed">
              {t('Free visit')}
            </Text>
          </Stack>
        )}
      </AppShellHeader>

      <AppShellMain
        h="100dvh"
        className="overflow-hidden pb-[var(--navigation-footer-height,4rem)]"
      >
        <Box pos="relative" h="100%">
          <Suspense fallback={<Box>{t('Loading map')}</Box>}>
            {museumMap.parsed ? (
              <MuseumMap
                map={museumMap.parsed}
                h="100%"
                w="100%"
                renderPaused={scanning}
                navMesh={wheelchairRoute ? museum.navMeshWheelchair : museum.navMesh}
                currentObjectId={currentObjectId}
                destination={destination}
                onRouteUnavailable={setRouteUnavailable}
                onStartEntranceChange={setStartEntranceId}
                onRouteChange={setRoute}
                progressPoint={settings.gpsMode === 'off' ? null : guidance.progressPoint}
                onObjectClick={(id) => {
                  const command = commandById(`object:${id}`)
                  if (command) run(command)
                }}
              />
            ) : (
              <Box>{t('Map not available')}</Box>
            )}
          </Suspense>
          {/* Only the space between the measured bars belongs to map controls. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--navigation-header-height,7rem)] min-h-0">
            <NavigationControls
              museum={museum}
              commands={commands}
              nearby={nearbyCommands}
              onRun={run}
              services={markers.services}
              exits={markers.exitEntrances}
              settings={
                <GuidanceSettings settings={settings} gpsError={gps.error} compass={compass} />
              }
              simulator={
                settings.gpsMode === 'simulated' ? (
                  <GpsSimulator
                    onMove={(east, north) => {
                      gps.move(east, north)
                      compass.turn(east, north)
                    }}
                  />
                ) : null
              }
              proximity={
                // A guessed entrance is never treated as the visitor's position.
                // Group guests continue following the host, including `at`.
                !guest && !scanning && currentObjectId && settings.gpsMode !== 'off' ? (
                  <NavigationProximity
                    point={guidance.estimate}
                    heading={compass.heading}
                    rooms={rooms}
                    catalog={catalog}
                    nextId={nextObjectId}
                    tourObjectIds={tourObjectIds}
                    discoveries={settings.suggestions}
                    scopeKey={`${positionScope}:${destination?.kind === 'object' ? destination.id : (destination?.target ?? '')}`}
                    onOpen={(id) => {
                      const command = commandById(`object:${id}`)
                      if (command) run(command)
                    }}
                    onConfirm={(id) =>
                      router.replace(
                        withNavigationValue(
                          navigationBasePath(lng, scope),
                          search.toString(),
                          'at',
                          id,
                        ),
                        { scroll: false },
                      )
                    }
                  />
                ) : null
              }
            />
          </div>
        </Box>
      </AppShellMain>

      <AppShellFooter ref={footerRef} className="h-auto rounded-t-md">
        <Group className="min-h-16 py-1" px="xs" gap="xs" align="center">
          {/* Directions use the remaining width; the orb keeps its intrinsic
              target size instead of reserving a fifth of a narrow screen.
              Active guidance places the orb beside its arrows at enlarged text. */}
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
              // A completed tour with a quiz offers it right where "Tour completed" shows.
              action={
                tour && complete && hasQuiz(tour) && !guest ? (
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
                ) : null
              }
            />
          </Box>
        </Group>
      </AppShellFooter>
    </>
  )
}

/** The museum's declared accessibility, in words the assistant can repeat. */
function accessibilityContext(museum: Museum) {
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
function useDestinationName(
  destination: NavigationDestination | null,
  catalog: NavigationCatalogObject[],
  services: ServiceMarker[],
  exits: ExitEntranceMarker[],
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

function NavigationControls({
  museum,
  commands,
  nearby,
  onRun,
  services,
  exits,
  settings,
  simulator,
  proximity,
}: {
  museum: Museum
  commands: NavigationCommand[]
  nearby: NavigationCommand[]
  onRun: (command: NavigationCommand) => void
  services: ServiceMarker[]
  exits: ExitEntranceMarker[]
  settings: React.ReactNode
  simulator: React.ReactNode
  proximity: React.ReactNode
}) {
  // The overlay buttons are shortcuts to the same commands as search.
  const search = useSearchParams()
  const { t } = useTranslation('tour-navigation')
  // Literal `t()` calls (not a dynamic key) so `i18next-cli extract` sees the
  // service labels; the type-keyed lookup is only used for rendering.
  const serviceLabel: Record<ServiceType, string> = {
    bathrooms: t('Toilets'),
    food: t('Food'),
    infoPoint: t('Info point'),
    shop: t('Shop'),
  }
  const command = (id: string) => commands.find((item) => item.id === id)
  const runId = (id: string) => {
    const found = command(id)
    if (found) onRun(found)
  }
  const wheelchairMapAvailable = Boolean(museum.navMeshWheelchair)
  const wheelchairRoute = wheelchairMapAvailable && search.get('mobility') === 'wheelchair'
  // Only placed markers can be routed to: an unplaced service exists in the
  // museum but has no position on the map yet.
  const placedServices = services.filter((node) => node.placed)
  const placedExits = exits.filter((node) => node.placed && node.direction === 'exit')
  // One button per service type present, routing to the closest instance.
  const serviceTypes = SERVICE_TYPES.filter((type) =>
    placedServices.some((node) => node.service === type),
  )
  const activeService = search.get('service')
  const exitTarget = search.get('exit')
  // Toggling an active service/exit off returns to the tour route.
  const resume = command('resume-tour')
  const nextStop = command('next-stop')
  const desktop = useMatches({ base: false, md: true })
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const scroll = scrollRef.current
    const content = contentRef.current
    if (!scroll || !content) return
    // Only a genuinely overflowing column owns pan gestures. Empty map space
    // stays draggable; gaps between overflowing notices remain scrollable.
    const update = () => setOverflowing(scroll.scrollHeight > scroll.clientHeight + 1)
    const observer = new ResizeObserver(update)
    observer.observe(scroll)
    observer.observe(content)
    // Notices mounting or unmounting change what overflows. Attribute and
    // text changes are left out: they fire on every hover and sensor update,
    // and a size change they cause already reaches the ResizeObserver.
    const mutations = new MutationObserver(update)
    mutations.observe(content, { childList: true, subtree: true })
    update()
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])

  const serviceActions: NavigationServiceAction[] = serviceTypes.map((type) => ({
    id: type,
    label: serviceLabel[type],
    Icon: SERVICE_META[type].Icon,
    color: SERVICE_META[type].color,
    active: activeService === type,
    onSelect: () => runId(activeService === type ? 'resume-tour' : `service-type:${type}`),
  }))
  if (placedExits.length)
    serviceActions.push({
      id: 'exit',
      label: t('Nearest exit'),
      Icon: DoorOpen,
      color: 'red',
      active: Boolean(exitTarget),
      onSelect: () => runId(exitTarget ? 'resume-tour' : 'exit:nearest'),
    })
  if (wheelchairMapAvailable)
    serviceActions.push({
      id: 'wheelchair',
      label: t('Wheelchair route'),
      Icon: Accessibility,
      color: ACCESSIBILITY_COLOR,
      active: wheelchairRoute,
      onSelect: () => runId('wheelchair'),
    })

  return (
    // The upper slot can scroll/shrink. The essential dock never gets pushed
    // below the footer by a simulator, a notice, or larger text.
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 p-2">
      <div
        ref={scrollRef}
        className={`min-h-0 w-full max-w-sm justify-self-center overflow-y-auto from-md:justify-self-start ${overflowing ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div ref={contentRef} className="flex h-max min-h-full flex-col justify-between gap-2">
          <div className="pointer-events-auto flex w-fit max-w-full flex-col gap-2">
            {simulator}
            {proximity}
          </div>
          {(nextStop || resume) && (
            <Group
              gap="xs"
              justify="center"
              className={`pointer-events-auto ${classes.controlRow}`}
            >
              {nextStop && (
                <Button
                  color="museum.8"
                  autoContrast
                  className={NAVIGATION_ACTION_CLASS}
                  onClick={() => onRun(nextStop)}
                >
                  {nextStop.label}
                </Button>
              )}
              {resume && (
                <Button
                  variant="default"
                  className={NAVIGATION_ACTION_CLASS}
                  onClick={() => onRun(resume)}
                >
                  {resume.label}
                </Button>
              )}
            </Group>
          )}
        </div>
      </div>
      <div className="pointer-events-auto flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-end justify-center gap-2 from-md:justify-start">
          <NavigationServices actions={serviceActions} />
          <Button
            onClick={() => runId('scan')}
            size="md"
            className={`${NAVIGATION_ACTION_CLASS} rounded-full`}
            rightSection={<ScanQrCode size={24} />}
            color="dark"
          >
            {t('Scan')}
          </Button>
          <Tooltip
            disabled={!desktop}
            events={{ hover: true, focus: true, touch: false }}
            label={
              <Group gap={6} wrap="nowrap">
                {t('Search')}
                <Kbd size="xs">/</Kbd>
              </Group>
            }
          >
            <ActionIcon
              aria-label={t('Search')}
              aria-keyshortcuts="/ Control+K Meta+K"
              variant="white"
              autoContrast
              radius="xl"
              size={44}
              onClick={spotlight.open}
            >
              <Search size={22} />
            </ActionIcon>
          </Tooltip>
          {settings}
          <NavigationSpotlight commands={commands} nearby={nearby} onRun={onRun} />
        </div>
      </div>
    </div>
  )
}
