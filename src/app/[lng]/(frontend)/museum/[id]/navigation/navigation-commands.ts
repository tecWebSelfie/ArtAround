'use client'

import type { Museum } from '@/payload-types'
import type { ExitEntranceMarker, ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import {
  DESTINATION_KEYS,
  navigationBasePath,
  navigationContentPath,
  navigationScanPath,
  tourNavigationPath,
  withNavigationPosition,
  withNavigationValue,
  type NavigationCatalogObject,
  type NavigationScope,
} from '@/lib/tour-navigation'
import type { NavigationTourSummary } from './TourNavigationShell'
import { EXPANSION_ANGLES, MAX_EXPANSION_STEPS } from '@/lib/expansion'
import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { guestCommands } from '@/lib/group'
import type { Route } from 'next'
import { extractID } from 'payload/shared'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * One list of everything a visitor can do while navigating. Every command is
 * just a URL (destination, mobility, or a modal route), so the same list
 * powers three inputs without extra plumbing:
 *
 * - the Spotlight search results,
 * - the quick pills shown in the empty Spotlight,
 * - the voice assistant, which only picks a command id; the browser runs it.
 */
export type NavigationCommand = {
  id: string
  label: string
  description: string
  /** `quick` commands are the empty-Spotlight pills; the rest are search results. */
  group: 'quick' | 'tour' | 'object' | 'content' | 'service' | 'exit'
  href: Route
  /** Same-page URL state (destination, mobility) replaces; modal routes push. */
  replace: boolean
  /** Price in cents when the content is paid and locked for this visitor. */
  lockedPrice?: number
}

export function useNavigationCommands({
  museum,
  scope,
  tours = [],
  catalog,
  services,
  exits,
}: {
  museum: Museum
  scope: NavigationScope
  /** Free navigation: the museum's tours, offered as "start this tour". */
  tours?: NavigationTourSummary[]
  catalog: NavigationCatalogObject[]
  services: ServiceMarker[]
  exits: ExitEntranceMarker[]
}) {
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation('tour-navigation')
  const guest = useIsGroupGuest()

  const commands = useMemo<NavigationCommand[]>(() => {
    // Literal `t()` calls, all here, so `i18next-cli extract` sees every label.
    const labels: CommandLabels = {
      nearestService: {
        bathrooms: t('Nearest toilets'),
        food: t('Nearest food'),
        infoPoint: t('Nearest info point'),
        shop: t('Nearest shop'),
      },
      service: {
        bathrooms: t('Toilets'),
        food: t('Food'),
        infoPoint: t('Info point'),
        shop: t('Shop'),
      },
      more: { more: t('Tell me more'), curiosities: t('Curiosities'), story: t('Its story') },
      openNextStop: t('Open next stop'),
      previousStop: t('Previous stop'),
      tour: t('Tour'),
      whatIsThis: t('What is this?'),
      resumeTour: t('Back to the tour route'),
      clearDestination: t('End route'),
      arrived: t("I'm here"),
      route: t('Route'),
      serviceKind: t('Service'),
      nearestExit: t('Nearest exit'),
      exit: t('Exit'),
      standardRoute: t('Standard route'),
      wheelchairRoute: t('Wheelchair route'),
      scan: t('Scan a QR code'),
      position: t('Position'),
      tourStops: (count) => t('Tour · {{count}} stops', { count }),
      object: t('Object'),
      aboutThisWork: t('About this work'),
      author: t('Who is the author?'),
      style: t('What style is it?'),
      readingOptions: t('Reading options'),
      simpler: t('Simpler'),
      harder: t('More in depth'),
      shorter: t('Shorter'),
      children: t('For children'),
      original: t('Original'),
    }
    const query = search.toString()
    const here = navigationBasePath(lng, scope)
    const context: CommandContext = {
      lng,
      scope,
      search,
      pathname,
      here,
      href: (path) => withNavigationPosition(path, query),
      // Choosing one destination clears the others (see withNavigationValue).
      destination: (key, value) => withNavigationValue(here, query, key, value),
      catalog,
      // Only placed markers have a map position to route to.
      placedServices: services.filter((node) => node.placed),
      placedExits: exits.filter((node) => node.placed && node.direction === 'exit'),
      labels,
      focus: navigationFocus({ scope, pathname, catalog }),
    }
    const all = [
      ...modalCommands(context),
      ...quickCommands(context, Boolean(museum.navMeshWheelchair)),
      ...tourCommands(context, tours),
      ...searchableCommands(context),
    ]
    // In a group the host leads: a guest never gets a step or destination.
    return guest ? guestCommands(all) : all
  }, [
    lng,
    scope,
    tours,
    catalog,
    services,
    exits,
    museum.navMeshWheelchair,
    search,
    pathname,
    t,
    guest,
  ])

  /** Runs a command: every command is a URL change. */
  const run = useCallback(
    (command: NavigationCommand) =>
      command.replace
        ? router.replace(command.href, { scroll: false })
        : router.push(command.href, { scroll: false }),
    [router],
  )

  return { commands, run }
}

type CommandLabels = {
  nearestService: Record<ServiceType, string>
  service: Record<ServiceType, string>
  more: Record<(typeof EXPANSION_ANGLES)[number], string>
  tourStops: (count: number) => string
} & Record<
  | 'openNextStop'
  | 'previousStop'
  | 'tour'
  | 'whatIsThis'
  | 'resumeTour'
  | 'clearDestination'
  | 'arrived'
  | 'route'
  | 'serviceKind'
  | 'nearestExit'
  | 'exit'
  | 'standardRoute'
  | 'wheelchairRoute'
  | 'scan'
  | 'position'
  | 'object'
  | 'aboutThisWork'
  | 'author'
  | 'style'
  | 'readingOptions'
  | 'simpler'
  | 'harder'
  | 'shorter'
  | 'children'
  | 'original',
  string
>

/** What every command builder reads: the URL, the museum's catalog and markers. */
type CommandContext = {
  lng: string
  scope: NavigationScope
  search: URLSearchParams
  pathname: string
  /** The navigation's own base path (free or this tour step). */
  here: string
  /** A path with the shareable navigation state carried over. */
  href: (path: string) => Route
  destination: (key: 'to' | 'service' | 'exit', value: string | null) => Route
  catalog: NavigationCatalogObject[]
  placedServices: ServiceMarker[]
  placedExits: ExitEntranceMarker[]
  labels: CommandLabels
  /** The tour's stops around the cursor and the work in front (`navigationFocus`). */
  focus: ReturnType<typeof navigationFocus>
}

/**
 * A one-command list built from `value` when it is set, else none: the
 * optional quick pills (a command is only built when it will be shown).
 */
function only<T>(
  value: T | null | undefined | false | 0,
  build: (value: T) => NavigationCommand,
): NavigationCommand[] {
  return value ? [build(value)] : []
}

/**
 * The tour's stops around the current one, and the work the visitor is
 * looking at. Only an open modal says that: the object modal's work, or the
 * work behind the open content or stop. A confirmed position or the tour's
 * current stop doesn't (the visitor may still be walking there), so without
 * a modal there is no work and the commands about it ("what is this?", the
 * author, the style) stay out of the Spotlight.
 */
function navigationFocus({
  scope,
  pathname,
  catalog,
}: Pick<CommandContext, 'scope' | 'pathname' | 'catalog'>) {
  const tour = scope.kind === 'tour' ? scope.tour : null
  const step = scope.kind === 'tour' ? scope.step : 0
  const next = tour?.contents[step]
  const nextId = next && extractID(next)
  const previous = step > 0 ? tour?.contents[step - 1] : undefined
  const previousId = previous && extractID(previous)
  const openContentId =
    /\/content\/([^/]+)$/.exec(pathname)?.[1] ?? (/\/open$/.test(pathname) ? nextId : null)
  const openObject = catalog.find(
    (object) => object.id === /\/object\/([^/]+)$/.exec(pathname)?.[1],
  )
  // The work behind the open content: "cos'è questo?" opens its object page.
  const contentWork = openContentId
    ? catalog.find((object) => object.contents.some((content) => content.id === openContentId))
    : undefined
  return { tour, nextId, previousId, openContentId, contentWork, work: openObject ?? contentWork }
}

/**
 * The empty Spotlight's pills: tour steps, "what is this?", services, exits,
 * route. Each exists only where it changes something: a pill that would
 * reopen what is open or reselect the active destination is left out, so
 * the voice assistant (same list) can't run it either.
 */
function quickCommands(context: CommandContext, wheelchairAvailable: boolean) {
  const { lng, scope, search, here, href, destination, labels } = context
  const { tour, nextId, previousId, openContentId, contentWork } = context.focus
  const hasDestination = DESTINATION_KEYS.some((key) => search.has(key))
  const wheelchairOn = wheelchairAvailable && search.get('mobility') === 'wheelchair'
  const quick = 'quick' as const
  return [
    // Not while that stop is already open: the pill would reopen it.
    ...only(nextId !== openContentId && nextId, (id) => ({
      id: 'next-stop',
      label: labels.openNextStop,
      description: labels.tour,
      group: quick,
      href: href(navigationContentPath(lng, scope, id)),
      replace: false,
    })),
    // "Indietro": the previous stop's content again (group guests can't,
    // see guestCommands: the host leads).
    ...only(previousId, (id) => ({
      id: 'previous-stop',
      label: labels.previousStop,
      description: labels.tour,
      group: quick,
      href: href(navigationContentPath(lng, scope, id)),
      replace: false,
    })),
    // Only on an open content (see navigationFocus); on the object modal
    // the visitor is already reading about the work.
    ...only(contentWork, (work) => ({
      id: 'what-is-this',
      label: labels.whatIsThis,
      description: work.name,
      group: quick,
      href: href(`${here}/object/${work.id}`),
      replace: false,
    })),
    // "I'm here": the visitor reached the chosen destination. An object
    // becomes the confirmed position (`at`, the same explicit confirmation
    // as "Set as my position"); a service or exit has no object, so the
    // position stays. Either way the destination is done and cleared, and a
    // tour's route to its next stop comes back. Not for group guests (the
    // host leads; `guestCommands` keeps an allowlist).
    ...only(hasDestination, () => {
      const arrived = new URLSearchParams(search)
      const reached = arrived.get('to')
      for (const key of ['to', 'service', 'exit']) arrived.delete(key)
      if (reached) arrived.set('at', reached)
      return {
        id: 'arrived',
        label: labels.arrived,
        description: labels.route,
        group: quick,
        href: withNavigationPosition(here, arrived.toString()),
        replace: true,
      }
    }),
    // Same id in both modes (the overlay toggles services off with it): a
    // tour resumes its route, free navigation clears the target.
    ...only(hasDestination, () => ({
      id: 'resume-tour',
      label: tour ? labels.resumeTour : labels.clearDestination,
      description: tour ? labels.tour : labels.route,
      group: quick,
      href: destination('to', null),
      replace: true,
    })),
    // One "nearest" pill per service type present; the map picks the closest.
    // The active one is left out: the controls toggle it off with resume-tour.
    ...SERVICE_TYPES.filter(
      (type) =>
        search.get('service') !== type &&
        context.placedServices.some((node) => node.service === type),
    ).map((type) => ({
      id: `service-type:${type}`,
      label: labels.nearestService[type],
      description: labels.serviceKind,
      group: quick,
      href: destination('service', type),
      replace: true,
    })),
    ...only(search.get('exit') !== 'nearest' && context.placedExits.length, () => ({
      id: 'exit:nearest',
      label: labels.nearestExit,
      description: labels.exit,
      group: quick,
      href: destination('exit', 'nearest'),
      replace: true,
    })),
    ...only(wheelchairAvailable, () => ({
      id: 'wheelchair',
      label: wheelchairOn ? labels.standardRoute : labels.wheelchairRoute,
      description: labels.route,
      group: quick,
      href: withNavigationValue(
        here,
        search.toString(),
        'mobility',
        wheelchairOn ? null : 'wheelchair',
      ),
      replace: true,
    })),
    {
      id: 'scan',
      label: labels.scan,
      description: labels.position,
      group: quick,
      // Its own page, not over the map: the camera and the map's controls
      // on one screen were confusing. It comes back here (see QrScanPage).
      href: navigationScanPath(lng, href(here)),
      replace: false,
    },
  ]
}

/**
 * Free navigation can turn into a tour: starting one keeps the confirmed
 * position, wheelchair route and audience, and drops any free destination
 * (the tour routes to its first stop). The tour URL lives inside this
 * museum's navigation, so the same shell (and map) carries on.
 */
function tourCommands(
  { lng, scope, search, labels }: CommandContext,
  tours: NavigationTourSummary[],
): NavigationCommand[] {
  if (scope.kind !== 'free') return []
  const startTour = new URLSearchParams(search)
  for (const key of DESTINATION_KEYS) startTour.delete(key)
  return tours
    .filter((item) => item.canStart)
    .map((item) => ({
      id: `tour:${item.id}`,
      label: item.title,
      description: labels.tourStops(item.stops),
      group: 'tour',
      href: withNavigationPosition(
        tourNavigationPath(lng, scope.museumId, item.id, 0),
        startTour.toString(),
      ),
      replace: false,
    }))
}

/** Search results: the works and their contents, each service and exit. */
function searchableCommands(context: CommandContext): NavigationCommand[] {
  const { lng, scope, here, href, destination, labels } = context
  return [
    ...context.catalog.flatMap((object) => [
      {
        id: `object:${object.id}`,
        label: object.name,
        // The author too (Wikidata `creators`): the search matches the
        // description, so "Caravaggio" finds his works on the map.
        description: [labels.object, ...(object.creators ?? []).map(({ name }) => name)].join(
          ' · ',
        ),
        group: 'object' as const,
        href: href(`${here}/object/${object.id}`),
        replace: false,
      },
      ...object.contents.map((content) => ({
        id: `content:${content.id}`,
        label: content.title,
        description: object.name,
        group: 'content' as const,
        href: href(navigationContentPath(lng, scope, content.id)),
        replace: false,
        ...(content.locked && content.price ? { lockedPrice: content.price } : {}),
      })),
    ]),
    // Services are per instance here, so search can pick one exact marker.
    ...context.placedServices.map((node) => ({
      id: `service:${node.id}`,
      label: node.name ?? labels.service[node.service],
      description: labels.serviceKind,
      group: 'service' as const,
      href: destination('service', node.id),
      replace: true,
    })),
    ...context.placedExits.map((node) => ({
      id: `exit:${node.id}`,
      label: node.name ?? labels.exit,
      description: labels.exit,
      group: 'exit' as const,
      href: destination('exit', node.id),
      replace: true,
    })),
  ]
}

/**
 * While a content, step or object modal is open: its "Tell me more" pills
 * (so the voice assistant can open them), the work's author and style, and
 * on a content the reading options ("non ho capito" → Simpler; voice picks
 * fixed values: easiest wording, one-minute read).
 */
function modalCommands(context: CommandContext): NavigationCommand[] {
  const { pathname, labels } = context
  const { work } = context.focus
  const modalOpen = /\/(content|object)\/[^/]+$|\/open$/.test(pathname)
  const contentOpen = /\/content\/[^/]+$|\/open$/.test(pathname)
  const about = (id: string, label: string, subject?: { id: string; name: string }) =>
    only(subject, (about) => ({
      id,
      label,
      description: about.name,
      group: 'quick',
      href: `/${context.lng}/subject/${about.id}` as Route,
      replace: false,
    }))
  return [
    ...(modalOpen ? expansionCommands(context) : []),
    ...(contentOpen ? versionCommands(context) : []),
    ...about('author', labels.author, work?.creators?.[0]),
    ...about('style', labels.style, work?.movements?.[0]),
  ]
}

/**
 * The "Tell me more" angles: they only set `?more=` on the modal URL; asking
 * again for the angle already open goes one step further (`?step=`), until
 * the last step, where the angle has nothing more to give and is left out.
 */
function expansionCommands({ search, pathname, labels }: CommandContext): NavigationCommand[] {
  const step = Number(search.get('step')) || 1
  const exhausted = (angle: string) => search.get('more') === angle && step >= MAX_EXPANSION_STEPS
  return EXPANSION_ANGLES.filter((angle) => !exhausted(angle)).map((angle) => {
    const params = new URLSearchParams(search)
    if (search.get('more') !== angle) params.delete('step')
    else if (step < MAX_EXPANSION_STEPS) params.set('step', String(step + 1))
    params.set('more', angle)
    return {
      id: `more:${angle}`,
      label: labels.more[angle],
      description: labels.aboutThisWork,
      group: 'quick',
      href: `${pathname}?${params}` as Route,
      replace: true,
    }
  })
}

/**
 * A content's reading options, each a set of version parameters. The one
 * already shown is left out ("Simpler" on the simpler text, "Original" on
 * the original), as it would change nothing.
 */
function versionCommands({ search, pathname, labels }: CommandContext): NavigationCommand[] {
  const version = (label: string, id: string, set: Record<string, string | null>) => {
    const active = Object.entries(set).every(([key, value]) => search.get(key) === value)
    if (active) return []
    const params = new URLSearchParams(search)
    for (const [key, value] of Object.entries(set)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    params.delete('more')
    params.delete('step')
    return [
      {
        id,
        label,
        description: labels.readingOptions,
        group: 'quick' as const,
        href: `${pathname}?${params}` as Route,
        replace: true,
      },
    ]
  }
  return [
    ...version(labels.simpler, 'version:simpler', { level: 'easy' }),
    // "Troppo semplice": the most detailed wording.
    ...version(labels.harder, 'version:harder', { level: 'hard' }),
    // A short version: half a minute, whatever the original's length.
    ...version(labels.shorter, 'version:shorter', { seconds: '30' }),
    ...version(labels.children, 'version:children', { audience: 'children' }),
    ...version(labels.original, 'version:original', {
      level: null,
      seconds: null,
      audience: null,
      age: null,
    }),
  ]
}
