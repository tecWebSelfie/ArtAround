'use client'

import type { Museum } from '@/payload-types'
import { ActionIcon, Button, Group, Kbd, Paper, Tooltip, useMatches } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { ACCESSIBILITY_COLOR } from '@/theme'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import type { ExitEntranceMarker, ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import {
  Accessibility,
  DoorOpen,
  MapPinCheck,
  Navigation,
  Route,
  ScanQrCode,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { DockButton } from './DockButton'
import { NavigationSpotlight } from './NavigationSpotlight'
import { NavigationServices, type NavigationServiceAction } from './NavigationServices'
import { NAVIGATION_COMPACT_ACTION_CLASS } from './navigation-touch'
import type { NavigationCommand } from './navigation-commands'
import { GuidanceSettings, type GuidanceSettingsValue } from './GuidanceSettings'
import { GpsSimulator } from './GpsSimulator'
import type { useGpsFix } from './gps-source'
import type { useCompass } from './compass-source'

/**
 * The map's floating controls: GPS notices on top (a column that scrolls
 * only when it overflows), the simulated GPS stick when on, then one bottom
 * bar ranked by importance. The overlay buttons are shortcuts to the same
 * commands as search.
 *
 *   [Search]                                    [Services]
 *   [Resume]     [ Scan ] [ contextual CTA ]    [Settings]
 *   support      the way forward, centred       support
 *
 * The centre holds what moves the visit on, so it changes with the state:
 * - Scan, always: at any moment a QR opens what the visitor stands before
 *   (and from there it can become their position);
 * - then "I'm here" when a destination is chosen (arrival confirms the
 *   position), else "Open next stop" in a tour, else "Where to?", which
 *   opens search to choose a destination.
 * The edges hold support: search (unless the centre is already search),
 * resuming the tour / clearing the destination, services and guidance
 * settings. Centre pills are 36px and labelled; edge tools are quiet icons,
 * labelled from md (`DockButton`); all keep 44px targets.
 */
export function NavigationControls({
  museum,
  commands,
  nearby,
  onRun,
  services,
  exits,
  sensors,
  proximity,
}: {
  museum: Museum
  commands: NavigationCommand[]
  nearby: NavigationCommand[]
  onRun: (command: NavigationCommand) => void
  services: ServiceMarker[]
  exits: ExitEntranceMarker[]
  /** The guidance settings and the GPS source they chose (for the simulator). */
  sensors: {
    settings: GuidanceSettingsValue
    gps: ReturnType<typeof useGpsFix>
    compass: ReturnType<typeof useCompass>
    /** The simulator's walk slid along walls (see `useRouteGuidance`). */
    walk: (east: number, north: number) => { east: number; north: number }
  }
  proximity: React.ReactNode
}) {
  const { t } = useTranslation('tour-navigation')
  const command = (id: string) => commands.find((item) => item.id === id)
  const runId = (id: string) => {
    const found = command(id)
    if (found) onRun(found)
  }
  // Toggling an active service/exit off returns to the tour route.
  const resume = command('resume-tour')
  const nextStop = command('next-stop')
  const desktop = useMatches({ base: false, md: true })
  // The map stays light in both themes, so the shutter is always dark ink.
  const scanColor = 'dark'
  const { scrollRef, contentRef, overflowing } = useOverflowing()

  const serviceActions = useServiceActions({ museum, services, exits, runId })

  // The centre's contextual action (see the header comment): arriving at
  // the destination, else the tour's next stop, else choosing where to go.
  const arrived = command('arrived')
  const lead = arrived ?? nextStop
  const capsule = 'pointer-events-auto flex flex-col items-stretch gap-1'
  const pill = `${NAVIGATION_COMPACT_ACTION_CLASS} shadow-(--mantine-shadow-md)`

  return (
    // The upper slot can scroll/shrink. The bottom bar never gets pushed
    // below the footer by a simulator, a notice, or larger text.
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 p-2">
      <div
        ref={scrollRef}
        className={`min-h-0 w-full max-w-sm overflow-y-auto ${overflowing ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div ref={contentRef} className="pointer-events-auto flex w-fit max-w-full flex-col gap-2">
          {proximity}
        </div>
      </div>
      {/* The simulated GPS stick: its own row on the start edge, just above
          the controls (where a game pad's stick sits), so the map above it
          stays clear. Only in builds with the simulator, when chosen. */}
      {sensors.settings.gpsMode === 'simulated' && (
        <div className="justify-self-start">
          <GpsSimulator
            onMove={(east, north) => {
              const walked = sensors.walk(east, north)
              sensors.gps.move(walked.east, walked.north)
              sensors.compass.turn(east, north)
            }}
          />
        </div>
      )}
      {/* Phones: support | centre | support, one bottom row within the
          thumbs' reach. From md the right of the map belongs to docked
          panels, so both support capsules stack on the left and the centre
          stays in the middle of the map. The grid takes no pointer events. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        {/* A shutter over its caption-sized action: Scan is the constant
            anchor (a 52px circle, the orb's size, like a camera's shutter),
            the contextual action a smaller pill beneath it. On a short screen
            (a phone held sideways) the two sit side by side instead. */}
        <div className="pointer-events-auto col-start-2 row-start-1 flex flex-col items-center gap-2 from-md:row-span-2 [@media(max-height:30rem)]:flex-row">
          <Tooltip
            label={t('Scan a QR code')}
            disabled={!desktop}
            events={{ hover: true, focus: true, touch: false }}
          >
            <ActionIcon
              onClick={() => runId('scan')}
              size={52}
              radius="xl"
              variant="filled"
              color={scanColor}
              autoContrast
              aria-label={t('Scan a QR code')}
              className="shadow-(--mantine-shadow-md)"
            >
              <ScanQrCode size={24} aria-hidden />
            </ActionIcon>
          </Tooltip>
          {lead ? (
            <Button
              color="museum.8"
              autoContrast
              radius="xl"
              size="sm"
              leftSection={
                arrived ? (
                  <MapPinCheck size={16} aria-hidden />
                ) : (
                  <Navigation size={16} aria-hidden />
                )
              }
              className={pill}
              onClick={() => onRun(lead)}
            >
              {lead.label}
            </Button>
          ) : (
            <Button
              color="museum.8"
              autoContrast
              radius="xl"
              size="sm"
              leftSection={<Search size={16} aria-hidden />}
              aria-keyshortcuts="/ Control+K Meta+K"
              className={pill}
              onClick={spotlight.open}
            >
              {t('Where to?')}
            </Button>
          )}
        </div>
        {/* Start edge: search (when the centre isn't already search) and
            leaving the chosen destination. */}
        {(lead || resume) && (
          <Paper
            radius="xl"
            shadow="md"
            p={3}
            withBorder
            role="group"
            aria-label={t('Find a work')}
            className={`${capsule} col-start-1 row-start-1 justify-self-start from-md:row-start-2`}
          >
            {lead && (
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
                <DockButton
                  label={t('Search')}
                  icon={<Search size={18} aria-hidden />}
                  aria-keyshortcuts="/ Control+K Meta+K"
                  onClick={spotlight.open}
                />
              </Tooltip>
            )}
            {resume && (
              <DockButton
                label={resume.label}
                icon={<Route size={18} aria-hidden />}
                onClick={() => onRun(resume)}
              />
            )}
          </Paper>
        )}
        {/* End edge: how to be guided. */}
        <Paper
          radius="xl"
          shadow="md"
          p={3}
          withBorder
          role="group"
          aria-label={t('Route')}
          className={`${capsule} col-start-3 row-start-1 justify-self-end from-md:col-start-1 from-md:justify-self-start`}
        >
          <NavigationServices actions={serviceActions} />
          <GuidanceSettings
            settings={sensors.settings}
            gpsError={sensors.gps.error}
            compass={sensors.compass}
          />
        </Paper>
        <NavigationSpotlight commands={commands} nearby={nearby} onRun={onRun} />
      </div>
    </div>
  )
}

/**
 * Whether the notice column overflows. Only a genuinely overflowing column
 * owns pan gestures: empty map space stays draggable, and gaps between
 * overflowing notices remain scrollable.
 */
function useOverflowing() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const scroll = scrollRef.current
    const content = contentRef.current
    if (!scroll || !content) return
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
  return { scrollRef, contentRef, overflowing }
}

/**
 * The dock's route shortcuts: one per service type present (to the closest
 * instance), the nearest exit, the wheelchair route. Tapping an active one
 * returns to the tour route. Only placed markers can be routed to: an
 * unplaced service exists in the museum but has no position on the map yet.
 */
function useServiceActions({
  museum,
  services,
  exits,
  runId,
}: {
  museum: Museum
  services: ServiceMarker[]
  exits: ExitEntranceMarker[]
  runId: (id: string) => void
}) {
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
  const placedServices = services.filter((node) => node.placed)
  const hasExits = exits.some((node) => node.placed && node.direction === 'exit')
  const activeService = search.get('service')
  const exitTarget = search.get('exit')
  const actions: NavigationServiceAction[] = SERVICE_TYPES.filter((type) =>
    placedServices.some((node) => node.service === type),
  ).map((type) => ({
    id: type,
    label: serviceLabel[type],
    Icon: SERVICE_META[type].Icon,
    color: SERVICE_META[type].color,
    active: activeService === type,
    onSelect: () => runId(activeService === type ? 'resume-tour' : `service-type:${type}`),
  }))
  if (hasExits) {
    actions.push({
      id: 'exit',
      label: t('Nearest exit'),
      Icon: DoorOpen,
      color: 'red',
      active: Boolean(exitTarget),
      onSelect: () => runId(exitTarget ? 'resume-tour' : 'exit:nearest'),
    })
  }
  if (museum.navMeshWheelchair) {
    actions.push({
      id: 'wheelchair',
      label: t('Wheelchair route'),
      Icon: Accessibility,
      color: ACCESSIBILITY_COLOR,
      active: search.get('mobility') === 'wheelchair',
      onSelect: () => runId('wheelchair'),
    })
  }
  return actions
}
