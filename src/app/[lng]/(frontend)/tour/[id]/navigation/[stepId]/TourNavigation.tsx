'use client'

import { NavigationAssistant } from '@/components/assistant/NavigationAssistant'
import { useSharedSpeech } from '@/components/assistant/speech-context'
import { useSpeech } from '@/components/assistant/use-speech'
import { Museum, Tour } from '@/payload-types'
import {
  ActionIcon,
  ActionIconGroup,
  ActionIconProps,
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellMainProps,
  Box,
  Button,
  Grid,
  GridCol,
  Group,
  Overlay,
  Progress,
  Stack,
  Title,
} from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { validateBuildJson } from '@pascal-app/core'
import { FlagBannerFoldIcon } from '@phosphor-icons/react'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import {
  collectMuseumMarkers,
  mapNodes,
  type ExitEntranceMarker,
  type ServiceMarker,
} from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import { museumRooms } from '@/lib/museum-rooms'
import {
  Accessibility,
  DoorOpen,
  FlagTriangleRight,
  LucideIcon,
  ScanQrCode,
  Search,
} from 'lucide-react'
import { Suspense, useEffect, useMemo, useState, type ComponentPropsWithoutRef } from 'react'
import { MuseumMap, type MuseumRoute } from './MuseumMap'
import { TourProgress } from './TourProgress'
import { DirectionsBar, useStepSentence, type DirectionsStatus } from './DirectionsBar'
import { GroupBadge } from '@/components/group/GroupBadge'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { GuidanceSettings, useGuidanceSettings } from './GuidanceSettings'
import { GpsSimulator } from './GpsSimulator'
import { useGpsFix } from './gps-source'
import { NavigationSpotlight } from './NavigationSpotlight'
import { useNavigationCommands, type NavigationCommand } from './navigation-commands'
import { useNearbySuggestions } from './use-nearby-suggestions'
import { useRouteGuidance } from './use-route-guidance'
import {
  contentObjectId,
  navigationDestination,
  tourHasQuiz as hasQuiz,
  tourNavigationPath,
  tourQuizPath,
  withNavigationValue,
  type NavigationCatalogObject,
  type NavigationDestination,
} from '@/lib/tour-navigation'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

/**
 * Composes the map, ordered tour progress, search, scan, and route guidance:
 * step-by-step directions in the navbar, optional GPS progress, nearby
 * suggestions, and the opt-in voice assistant (the orb). Search, pills and
 * the assistant all run the same URL commands (`navigation-commands.ts`).
 */
export const TourNavigationPage = ({
  tour,
  step,
  museum,
  catalog,
}: { tour: Tour; step: number; museum: Museum; catalog: NavigationCatalogObject[] } & Omit<
  AppShellMainProps,
  'step'
>) => {
  // URL state stays in the URL; this component reads it where map behavior needs it.
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
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
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  // Route guidance follows the next ordered content unless the visitor chose `to`.
  const defaultDestination =
    catalog.find((object) => object.contents.some((content) => content.id === nextId))?.id ??
    (typeof next === 'object' ? contentObjectId(next) : null)
  const destination = useMemo<NavigationDestination | null>(
    () =>
      navigationDestination(search) ??
      (defaultDestination ? { kind: 'object', id: defaultDestination } : null),
    [search, defaultDestination],
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
  const complete = step === tour.contents.length
  // Group guests follow the host, who leads them into the quiz too.
  const guest = useIsGroupGuest()

  const settings = useGuidanceSettings()
  const gps = useGpsFix(settings.gpsMode)
  const guidance = useRouteGuidance({ route, rooms, fix: gps.fix })
  const { commands, run } = useNavigationCommands({
    museum,
    tour,
    step,
    catalog,
    services: markers.services,
    exits: markers.exitEntrances,
  })
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
  // progress, or the arrows), only while the visitor has turned it on.
  const currentStep = guidance.steps[guidance.current]
  const spokenStep =
    currentStep && settings.voiceGuidance ? sentence(currentStep, destinationName) : null
  const { speak } = speech
  useEffect(() => {
    if (spokenStep) speak(spokenStep).catch(() => {})
  }, [spokenStep, speak])

  // Nearby suggestions follow the GPS estimate, or else the confirmed start.
  const here =
    guidance.estimate ??
    (route?.start ? ([route.start[0], route.start[2]] as [number, number]) : null)
  const tourContentIds = useMemo(
    () =>
      new Set(tour.contents.map((content) => (typeof content === 'string' ? content : content.id))),
    [tour.contents],
  )
  const commandById = (id: string) => commands.find((command) => command.id === id)
  const nearbyHistory = useNearbySuggestions({
    enabled: settings.suggestions,
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
        withNavigationValue(
          tourNavigationPath(lng, tour.id, step),
          search.toString(),
          'to',
          object.id,
        ),
        { scroll: false },
      ),
  })
  const nearbyCommands = nearbyHistory.flatMap(({ content }) => {
    const command = commandById(`content:${content.id}`)
    return command ? [command] : []
  })

  const status: DirectionsStatus | null = complete
    ? 'complete'
    : routeUnavailable
      ? 'unavailable'
      : !destination
        ? 'no-destination'
        : guidance.steps.length === 0
          ? 'loading'
          : null

  return (
    <>
      <AppShellHeader px="xs" pb="xs" className="rounded-b-xl">
        <Stack gap="xs">
          {/* In a group, the pill beside the title opens the group panel (GroupBadge). */}
          <Group justify="center" gap="xs" wrap="nowrap">
            <Title size="h5" ta="center">
              {tour.title}
            </Title>
            <GroupBadge />
          </Group>
          <Grid>
            <GridCol span={1}>
              <FlagTriangleRight size={14} />
            </GridCol>
            <GridCol span={'auto'} align={'center'}>
              <Progress
                aria-label={t('Tour progress')}
                size={'xs'}
                value={tour.contents.length ? (step / tour.contents.length) * 100 : 100}
              />
            </GridCol>
            <GridCol span={1}>
              <FlagBannerFoldIcon size={14} />
            </GridCol>
          </Grid>
          <TourProgress
            contents={tour.contents}
            step={step}
            entranceLabel={startEntrance ? (startEntrance.name ?? t('Entrance')) : null}
            hasQuiz={hasQuiz(tour)}
          />
        </Stack>
      </AppShellHeader>

      <AppShellMain h="100dvh" className={`overflow-hidden`}>
        <Box pos="relative" h="100%">
          <Suspense fallback={<Box>{t('Loading map')}</Box>}>
            {museumMap.parsed ? (
              <MuseumMap
                map={museumMap.parsed}
                h="100%"
                w="100%"
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
          <Overlay backgroundOpacity={0} style={{ pointerEvents: 'none' }}>
            <NavigationControls
              museum={museum}
              commands={commands}
              nearby={nearbyCommands}
              onRun={run}
              services={markers.services}
              exits={markers.exitEntrances}
              settings={<GuidanceSettings settings={settings} gpsError={gps.error} />}
              simulator={
                settings.gpsMode === 'simulated' ? <GpsSimulator onMove={gps.move} /> : null
              }
            />
          </Overlay>
        </Box>
      </AppShellMain>

      <AppShellFooter className="rounded-t-md">
        <Group h="100%" px="xs" gap="xs" wrap="nowrap" align="center">
          {/* About four fifths: the current step of the route. */}
          <Box className="min-w-0 flex-[4]">
            <DirectionsBar
              steps={guidance.steps}
              current={guidance.current}
              onCurrentChange={guidance.setCurrent}
              destination={destinationName}
              status={status}
              hint={
                !currentObjectId && !complete
                  ? t('Open an object and set it as your position')
                  : null
              }
              // A completed tour with a quiz offers it right where "Tour completed" shows.
              action={
                complete && hasQuiz(tour) && !guest ? (
                  <Button
                    size="compact-sm"
                    onClick={() => router.push(tourQuizPath(lng, tour.id, step, search.toString()))}
                  >
                    {t('Take the quiz')}
                  </Button>
                ) : null
              }
            />
          </Box>
          {/* The remaining fifth: the assistant orb, right-aligned. */}
          <Group className="flex-1" justify="end">
            <NavigationAssistant
              enabled={settings.assistant}
              onEnable={() => settings.setAssistant(true)}
              commands={commands.map(({ id, label, description }) => ({ id, label, description }))}
              context={[
                `Museum: ${museum.name}. Tour: ${tour.title}, stop ${step + 1} of ${tour.contents.length}.`,
                destination ? `Heading to: ${destinationName}.` : 'No destination chosen.',
                currentStep ? `Current direction: ${sentence(currentStep, destinationName)}.` : '',
              ].join(' ')}
              language={lng}
              speech={speech}
              onCommand={(id) => {
                const command = commandById(id)
                if (command) run(command)
              }}
            />
          </Group>
        </Group>
      </AppShellFooter>
    </>
  )
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
}: {
  museum: Museum
  commands: NavigationCommand[]
  nearby: NavigationCommand[]
  onRun: (command: NavigationCommand) => void
  services: ServiceMarker[]
  exits: ExitEntranceMarker[]
  settings: React.ReactNode
  simulator: React.ReactNode
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

  return (
    <Stack className="h-full" justify="space-between">
      <Group justify="start" className="p-2 pt-36">
        {simulator}
      </Group>
      <Stack gap="xs" className="p-2">
        {(nextStop || resume) && (
          <Group gap="xs" justify="center" style={{ pointerEvents: 'auto' }}>
            {nextStop && <Button onClick={() => onRun(nextStop)}>{nextStop.label}</Button>}
            {resume && (
              <Button variant="default" onClick={() => onRun(resume)}>
                {resume.label}
              </Button>
            )}
          </Group>
        )}
        <Group
          gap="xs"
          wrap="nowrap"
          align="end"
          justify="space-around"
          style={{ pointerEvents: 'auto' }}
        >
          {(serviceTypes.length > 0 || placedExits.length > 0) && (
            <ActionIconGroup orientation="vertical">
              {serviceTypes.map((type) => {
                const { Icon, color } = SERVICE_META[type]
                const label = serviceLabel[type]
                const active = activeService === type
                return (
                  <ServiceIcon
                    key={type}
                    icon={Icon}
                    color={color}
                    aria-label={label}
                    title={label}
                    aria-pressed={active}
                    variant={active ? 'filled' : 'light'}
                    onClick={() => runId(active ? 'resume-tour' : `service-type:${type}`)}
                  />
                )
              })}
              {placedExits.length > 0 && (
                <ServiceIcon
                  icon={DoorOpen}
                  color="red"
                  aria-label={t('Nearest exit')}
                  title={t('Nearest exit')}
                  aria-pressed={Boolean(exitTarget)}
                  variant={exitTarget ? 'filled' : 'light'}
                  onClick={() => runId(exitTarget ? 'resume-tour' : 'exit:nearest')}
                />
              )}
            </ActionIconGroup>
          )}

          {wheelchairMapAvailable && (
            <ActionIcon
              aria-label={t('Wheelchair route')}
              title={t('Wheelchair route')}
              size="lg"
              variant={wheelchairRoute ? 'filled' : 'white'}
              color="blue"
              radius="xl"
              aria-pressed={wheelchairRoute}
              onClick={() => runId('wheelchair')}
            >
              <Accessibility size={20} />
            </ActionIcon>
          )}

          <Button
            onClick={() => runId('scan')}
            size="compact-xl"
            rightSection={<ScanQrCode size={24} />}
            color="dark"
            className="rounded-full"
          >
            {t('Scan')}
          </Button>
          <ActionIcon
            aria-label={t('Search')}
            variant="white"
            autoContrast
            radius={'xl'}
            size={'lg'}
            className="p-1.5"
            onClick={spotlight.open}
          >
            <Search className="size-full" />
          </ActionIcon>
          {settings}
          <NavigationSpotlight commands={commands} nearby={nearby} onRun={onRun} />
        </Group>
      </Stack>
    </Stack>
  )
}

function ServiceIcon({
  icon: Icon,
  ...props
}: { icon: LucideIcon } & ActionIconProps & ComponentPropsWithoutRef<'button'>) {
  return (
    <ActionIcon variant="light" className="border-(--mantine-color-default-border)" {...props}>
      <Icon size={16} />
    </ActionIcon>
  )
}
