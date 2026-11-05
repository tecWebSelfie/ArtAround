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
import type { Route } from 'next'
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

/** Commands a group guest keeps besides `more:` and `version:` (see the end of the list). */
const GUEST_COMMANDS = new Set(['wheelchair', 'what-is-this', 'author', 'style'])

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
    const query = search.toString()
    const here = navigationBasePath(lng, scope)
    const href = (path: string) => withNavigationPosition(path, query)
    // Choosing one destination clears the others (see withNavigationValue).
    const destination = (key: 'to' | 'service' | 'exit', value: string | null) =>
      withNavigationValue(here, query, key, value)
    // Literal `t()` calls so `i18next-cli extract` sees every label.
    const nearestService: Record<ServiceType, string> = {
      bathrooms: t('Nearest toilets'),
      food: t('Nearest food'),
      infoPoint: t('Nearest info point'),
      shop: t('Nearest shop'),
    }
    const serviceLabel: Record<ServiceType, string> = {
      bathrooms: t('Toilets'),
      food: t('Food'),
      infoPoint: t('Info point'),
      shop: t('Shop'),
    }
    // Only placed markers have a map position to route to.
    const placedServices = services.filter((node) => node.placed)
    const placedExits = exits.filter((node) => node.placed && node.direction === 'exit')
    const tour = scope.kind === 'tour' ? scope.tour : null
    const next = tour?.contents[scope.kind === 'tour' ? scope.step : 0]
    const nextId = typeof next === 'string' ? next : next?.id
    const hasDestination = ['to', 'service', 'exit'].some((key) => search.has(key))
    const previous =
      tour && scope.kind === 'tour' && scope.step > 0 ? tour.contents[scope.step - 1] : null
    const previousId = typeof previous === 'string' ? previous : previous?.id
    // The work being looked at: the open object or content's object, the
    // stop modal's, else the visitor's position. Its author and movement
    // (Wikidata subjects) answer "who's the author?" and "what style is it?".
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
    const wheelchairAvailable = Boolean(museum.navMeshWheelchair)
    const wheelchairOn = wheelchairAvailable && search.get('mobility') === 'wheelchair'

    const quick: NavigationCommand[] = [
      ...(nextId
        ? [
            {
              id: 'next-stop',
              label: t('Open next stop'),
              description: t('Tour'),
              group: 'quick' as const,
              href: href(navigationContentPath(lng, scope, nextId)),
              replace: false,
            },
          ]
        : []),
      // "Indietro": the previous stop's content again (group guests can't,
      // see the filter at the end: the host leads).
      ...(previousId
        ? [
            {
              id: 'previous-stop',
              label: t('Previous stop'),
              description: t('Tour'),
              group: 'quick' as const,
              href: href(navigationContentPath(lng, scope, previousId)),
              replace: false,
            },
          ]
        : []),
      ...(inFront
        ? [
            {
              id: 'what-is-this',
              label: t('What is this?'),
              description: inFront.name,
              group: 'quick' as const,
              href: href(`${here}/object/${inFront.id}`),
              replace: false,
            },
          ]
        : []),
      ...(hasDestination
        ? [
            {
              // Same id in both modes (the overlay toggles services off with
              // it): a tour resumes its route, free navigation clears the target.
              id: 'resume-tour',
              label: tour ? t('Resume tour route') : t('Clear destination'),
              description: tour ? t('Tour') : t('Route'),
              group: 'quick' as const,
              href: destination('to', null),
              replace: true,
            },
          ]
        : []),
      // One "nearest" pill per service type present; the map picks the closest.
      ...SERVICE_TYPES.filter((type) => placedServices.some((node) => node.service === type)).map(
        (type) => ({
          id: `service-type:${type}`,
          label: nearestService[type],
          description: t('Service'),
          group: 'quick' as const,
          href: destination('service', type),
          replace: true,
        }),
      ),
      ...(placedExits.length
        ? [
            {
              id: 'exit:nearest',
              label: t('Nearest exit'),
              description: t('Exit'),
              group: 'quick' as const,
              href: destination('exit', 'nearest'),
              replace: true,
            },
          ]
        : []),
      ...(wheelchairAvailable
        ? [
            {
              id: 'wheelchair',
              label: wheelchairOn ? t('Standard route') : t('Wheelchair route'),
              description: t('Route'),
              group: 'quick' as const,
              href: withNavigationValue(
                here,
                query,
                'mobility',
                wheelchairOn ? null : 'wheelchair',
              ),
              replace: true,
            },
          ]
        : []),
      {
        id: 'scan',
        label: t('Scan a QR code'),
        description: t('Position'),
        group: 'quick',
        href: href(`${here}/scan`),
        replace: false,
      },
    ]

    // Free navigation can turn into a tour: starting one keeps the confirmed
    // position, wheelchair route and audience, and drops any free destination
    // (the tour routes to its first stop). The tour URL lives inside this
    // museum's navigation, so the same shell (and map) carries on.
    const startTour = new URLSearchParams(query)
    for (const key of ['to', 'service', 'exit']) startTour.delete(key)
    const tourCommands: NavigationCommand[] =
      scope.kind === 'free'
        ? tours.map((item) => ({
            id: `tour:${item.id}`,
            label: item.title,
            description: t('Tour · {{count}} stops', { count: item.stops }),
            group: 'tour' as const,
            href: withNavigationPosition(
              tourNavigationPath(lng, scope.museumId, item.id, 0),
              startTour.toString(),
            ),
            replace: false,
          }))
        : []

    const searchable: NavigationCommand[] = [
      ...tourCommands,
      ...catalog.flatMap((object) => [
        {
          id: `object:${object.id}`,
          label: object.name,
          description: t('Object'),
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
      ...placedServices.map((node) => ({
        id: `service:${node.id}`,
        label: node.name ?? serviceLabel[node.service],
        description: t('Service'),
        group: 'service' as const,
        href: destination('service', node.id),
        replace: true,
      })),
      ...placedExits.map((node) => ({
        id: `exit:${node.id}`,
        label: node.name ?? t('Exit'),
        description: t('Exit'),
        group: 'exit' as const,
        href: destination('exit', node.id),
        replace: true,
      })),
    ]
    // While a content, step or object modal is open, its "Tell me more" pills
    // are commands too, so the voice assistant can open them ("tell me
    // something curious about it"). They only set `?more=` on the modal URL;
    // asking again for the angle already open goes one step further (`?step=`).
    const modalOpen = /\/(content|object)\/[^/]+$|\/open$/.test(pathname)
    const moreLabels = {
      more: t('Tell me more'),
      curiosities: t('Curiosities'),
      story: t('Its story'),
    }
    const expansion: NavigationCommand[] = modalOpen
      ? EXPANSION_ANGLES.map((angle) => {
          const params = new URLSearchParams(search)
          const step = Number(search.get('step')) || 1
          if (search.get('more') === angle && step < MAX_EXPANSION_STEPS) {
            params.set('step', String(step + 1))
          } else if (search.get('more') !== angle) params.delete('step')
          params.set('more', angle)
          return {
            id: `more:${angle}`,
            label: moreLabels[angle],
            description: t('About this work'),
            group: 'quick' as const,
            href: `${pathname}?${params}` as Route,
            replace: true,
          }
        })
      : []
    // On a content, the reading options are commands too ("non ho capito" →
    // Simpler). Voice picks fixed values: easiest wording, one-minute read.
    const contentOpen = /\/content\/[^/]+$|\/open$/.test(pathname)
    const about = (id: string, label: string, subject: { id: string; name: string } | undefined) =>
      subject
        ? [
            {
              id,
              label,
              description: subject.name,
              group: 'quick' as const,
              href: `/${lng}/subject/${subject.id}` as Route,
              replace: false,
            },
          ]
        : []
    const subjects: NavigationCommand[] = [
      ...about('author', t('Who is the author?'), work?.creators?.[0]),
      ...about('style', t('What style is it?'), work?.movements?.[0]),
    ]
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
        description: t('Reading options'),
        group: 'quick' as const,
        href: `${pathname}?${params}` as Route,
        replace: true,
      }
    }
    const versions: NavigationCommand[] = contentOpen
      ? [
          version(t('Simpler'), 'version:simpler', { level: 'easy' }),
          // "Troppo semplice": the most detailed wording.
          version(t('More in depth'), 'version:harder', { level: 'hard' }),
          // A short version: half a minute, whatever the original's length.
          version(t('Shorter'), 'version:shorter', { seconds: '30' }),
          version(t('For children'), 'version:children', { audience: 'children' }),
          version(t('Original'), 'version:original', {
            level: null,
            seconds: null,
            audience: null,
          }),
        ]
      : []
    const all = [...expansion, ...versions, ...subjects, ...quick, ...searchable]
    // In a group the host decides where everyone goes: a guest keeps only
    // what changes their own reading and route (Tell me more, reading
    // options, wheelchair) and questions about the work in front of them
    // (what is it, its author and style), never a step or destination.
    return guest
      ? all.filter(({ id }) => /^(more|version):/.test(id) || GUEST_COMMANDS.has(id))
      : all
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
