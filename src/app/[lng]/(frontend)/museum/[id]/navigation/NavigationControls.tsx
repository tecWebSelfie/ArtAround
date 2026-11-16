'use client'

import type { Museum } from '@/payload-types'
import {
  Button,
  Group,
  Kbd,
  Paper,
  Tooltip,
  useComputedColorScheme,
  useMatches,
} from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { ACCESSIBILITY_COLOR } from '@/theme'
import { SERVICE_META } from '@/lib/pascal/museum-plugin/markers'
import type { ExitEntranceMarker, ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import { Accessibility, DoorOpen, Navigation, Route, ScanQrCode, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { DockButton } from './DockButton'
import { NavigationSpotlight } from './NavigationSpotlight'
import { NavigationServices, type NavigationServiceAction } from './NavigationServices'
import { NAVIGATION_COMPACT_ACTION_CLASS } from './navigation-touch'
import classes from './navigation-desktop.module.css'
import type { NavigationCommand } from './navigation-commands'
import { GuidanceSettings, type GuidanceSettingsValue } from './GuidanceSettings'
import { GpsSimulator } from './GpsSimulator'
import type { useGpsFix } from './gps-source'
import type { useCompass } from './compass-source'

/**
 * The map's floating controls: GPS notices on top (a column that scrolls
 * only when it overflows), the tour's next-stop and resume buttons, then the
 * dock with the service shortcuts, Scan, Search and the guidance settings.
 * The overlay buttons are shortcuts to the same commands as search.
 *
 * One visual family over the map, kept small so the map stays the loudest
 * thing: every control is a 36px full-round shape (44px target, The
 * Navigation Reach Rule) lifted by the same `md` shadow, grouped by what it
 * is for:
 *
 *   [ Open next stop ] [ Resume ]      the tour: labelled pills
 *   [ Search | Scan ]  [ Services | Settings ]
 *     find a work        the route: where to go, how to be guided
 *
 * Scan is the one solid pill (it opens the camera); the rest are quiet icons.
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
  // Scan is the capsule's one solid pill: dark ink on light, light ink on dark.
  const scanColor = useComputedColorScheme('light') === 'dark' ? 'gray.0' : 'dark'
  const { scrollRef, contentRef, overflowing } = useOverflowing()

  const serviceActions = useServiceActions({ museum, services, exits, runId })

  return (
    // The upper slot can scroll/shrink. The essential dock never gets pushed
    // below the footer by a simulator, a notice, or larger text.
    // On a short screen (a phone held sideways) the stack would stand in the
    // middle of the little map left between the bars: there the tour's pills
    // and the dock share one bottom row instead.
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 p-2 [@media(max-height:30rem)]:grid-flow-col [@media(max-height:30rem)]:grid-cols-[auto_auto] [@media(max-height:30rem)]:grid-rows-1 [@media(max-height:30rem)]:content-end [@media(max-height:30rem)]:items-end [@media(max-height:30rem)]:justify-center from-md:[@media(max-height:30rem)]:justify-start">
      <div
        ref={scrollRef}
        className={`min-h-0 w-full max-w-sm justify-self-center overflow-y-auto from-md:justify-self-start ${overflowing ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div ref={contentRef} className="flex h-max min-h-full flex-col justify-between gap-2">
          <div className="pointer-events-auto flex w-fit max-w-full flex-col gap-2">
            {sensors.settings.gpsMode === 'simulated' && (
              <GpsSimulator
                onMove={(east, north) => {
                  sensors.gps.move(east, north)
                  sensors.compass.turn(east, north)
                }}
              />
            )}
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
                  radius="xl"
                  size="sm"
                  leftSection={<Navigation size={16} aria-hidden />}
                  className={`${NAVIGATION_COMPACT_ACTION_CLASS} shadow-(--mantine-shadow-md)`}
                  onClick={() => onRun(nextStop)}
                >
                  {nextStop.label}
                </Button>
              )}
              {resume && (
                <Button
                  variant="default"
                  radius="xl"
                  size="sm"
                  leftSection={<Route size={16} aria-hidden />}
                  className={`${NAVIGATION_COMPACT_ACTION_CLASS} shadow-(--mantine-shadow-md)`}
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
        <div className="flex flex-wrap justify-center gap-2 from-md:justify-start">
          <Paper
            radius="xl"
            shadow="md"
            p={3}
            withBorder
            role="group"
            aria-label={t('Find a work')}
            className="flex items-center gap-1"
          >
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
            <Button
              onClick={() => runId('scan')}
              size="sm"
              radius="xl"
              className={NAVIGATION_COMPACT_ACTION_CLASS}
              rightSection={<ScanQrCode size={16} aria-hidden />}
              color={scanColor}
              autoContrast
            >
              {t('Scan')}
            </Button>
          </Paper>
          <Paper
            radius="xl"
            shadow="md"
            p={3}
            withBorder
            role="group"
            aria-label={t('Route')}
            className="flex items-center gap-1"
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
