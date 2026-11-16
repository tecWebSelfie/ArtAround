'use client'

import type { Museum } from '@/payload-types'
import type { ExitEntranceMarker, ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import {
  navigationBasePath,
  navigationContentPath,
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
      resumeTour: t('Resume tour route'),
      clearDestination: t('Clear destination'),
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
      focus: navigationFocus({ scope, search, pathname, catalog }),
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
 * The tour's stops around the current one, and the work in front of the
 * visitor: the open object or content's work, the stop modal's, else the
 * confirmed position's. Its author and movement (Wikidata subjects) answer
 * "who's the author?" and "what style is it?".
 */
function navigationFocus({
  scope,
  search,
  pathname,
  catalog,
}: Pick<CommandContext, 'scope' | 'search' | 'pathname' | 'catalog'>) {
  const tour = scope.kind === 'tour' ? scope.tour : null
  const step = scope.kind === 'tour' ? scope.step : 0
  const next = tour?.contents[step]
  const nextId = next && extractID(next)
  const previous = step > 0 ? tour?.contents[step - 1] : undefined
  const previousId = previous && extractID(previous)
  const openContentId =
    /\/content\/([^/]+)$/.exec(pathname)?.[1] ?? (/\/open$/.test(pathname) ? nextId : null)
  const objectOf = (contentId: string | null | undefined) =>
    contentId
      ? catalog.find((object) => object.contents.some((content) => content.id === contentId))
      : undefined
  const atPosition = catalog.find((object) => object.id === search.get('at'))
  const work =
    catalog.find((object) => object.id === /\/object\/([^/]+)$/.exec(pathname)?.[1]) ??
    objectOf(openContentId) ??
    atPosition
  // "Cos'è questo?": the work at the visitor's confirmed position; without
  // one (the base navigator places nobody), the work being looked at, else
  // the current tour stop's.
  const inFront = atPosition ?? work ?? objectOf(nextId)
  return { tour, nextId, previousId, work, inFront }
}

/** The empty Spotlight's pills: tour steps, "what is this?", services, exits, route. */
function quickCommands(context: CommandContext, wheelchairAvailable: boolean) {
  const { lng, scope, search, here, href, destination, labels } = context
  const { tour, nextId, previousId, inFront } = context.focus
  const hasDestination = ['to', 'service', 'exit'].some((key) => search.has(key))
  const wheelchairOn = wheelchairAvailable && search.get('mobility') === 'wheelchair'
  const quick = 'quick' as const
  return [
    ...only(nextId, (id) => ({
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
    ...only(inFront, (work) => ({
      id: 'what-is-this',
      label: labels.whatIsThis,
      description: work.name,
      group: quick,
      href: href(`${here}/object/${work.id}`),
      replace: false,
    })),
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
    ...SERVICE_TYPES.filter((type) =>
      context.placedServices.some((node) => node.service === type),
    ).map((type) => ({
      id: `service-type:${type}`,
      label: labels.nearestService[type],
      description: labels.serviceKind,
      group: quick,
      href: destination('service', type),
      replace: true,
    })),
    ...only(context.placedExits.length, () => ({
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
      href: href(`${here}/scan`),
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
  for (const key of ['to', 'service', 'exit']) startTour.delete(key)
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
 * again for the angle already open goes one step further (`?step=`).
 */
function expansionCommands({ search, pathname, labels }: CommandContext): NavigationCommand[] {
  const step = Number(search.get('step')) || 1
  return EXPANSION_ANGLES.map((angle) => {
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

/** A content's reading options, each a set of version parameters. */
function versionCommands({ search, pathname, labels }: CommandContext): NavigationCommand[] {
  const version = (label: string, id: string, set: Record<string, string | null>) => {
    const params = new URLSearchParams(search)
    for (const [key, value] of Object.entries(set)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    params.delete('more')
    params.delete('step')
    return {
      id,
      label,
      description: labels.readingOptions,
      group: 'quick' as const,
      href: `${pathname}?${params}` as Route,
      replace: true,
    }
  }
  return [
    version(labels.simpler, 'version:simpler', { level: 'easy' }),
    // "Troppo semplice": the most detailed wording.
    version(labels.harder, 'version:harder', { level: 'hard' }),
    // A short version: half a minute, whatever the original's length.
    version(labels.shorter, 'version:shorter', { seconds: '30' }),
    version(labels.children, 'version:children', { audience: 'children' }),
    version(labels.original, 'version:original', {
      level: null,
      seconds: null,
      audience: null,
      age: null,
    }),
  ]
}
