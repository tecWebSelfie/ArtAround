'use client'

import type { Museum, Tour } from '@/payload-types'
import type { ExitEntranceMarker, ServiceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { SERVICE_TYPES, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'
import {
  tourContentPath,
  tourNavigationPath,
  withNavigationPosition,
  withNavigationValue,
  type NavigationCatalogObject,
} from '@/lib/tour-navigation'
import { EXPANSION_ANGLES } from '@/lib/expansion'
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
  group: 'quick' | 'object' | 'content' | 'service' | 'exit'
  href: Route
  /** Same-page URL state (destination, mobility) replaces; modal routes push. */
  replace: boolean
  /** Price in cents when the content is paid and locked for this visitor. */
  lockedPrice?: number
}

export function useNavigationCommands({
  museum,
  tour,
  step,
  catalog,
  services,
  exits,
}: {
  museum: Museum
  tour: Tour
  step: number
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
    const here = tourNavigationPath(lng, tour.id, step)
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
    const next = tour.contents[step]
    const nextId = typeof next === 'string' ? next : next?.id
    const hasDestination = ['to', 'service', 'exit'].some((key) => search.has(key))
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
              href: href(tourContentPath(lng, tour, step, nextId)),
              replace: false,
            },
          ]
        : []),
      ...(hasDestination
        ? [
            {
              id: 'resume-tour',
              label: t('Resume tour route'),
              description: t('Tour'),
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

    const searchable: NavigationCommand[] = [
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
          href: href(tourContentPath(lng, tour, step, content.id)),
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
    // something curious about it"). They only set `?more=` on the modal URL.
    const modalOpen = /\/(content|object)\/[^/]+$|\/open$/.test(pathname)
    const moreLabels = {
      more: t('Tell me more'),
      curiosities: t('Curiosities'),
      story: t('Its story'),
    }
    const expansion: NavigationCommand[] = modalOpen
      ? EXPANSION_ANGLES.map((angle) => {
          const params = new URLSearchParams(search)
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
    const version = (label: string, id: string, set: Record<string, string | null>) => {
      const params = new URLSearchParams(search)
      for (const [key, value] of Object.entries(set)) {
        if (value === null) params.delete(key)
        else params.set(key, value)
      }
      params.delete('more')
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
          version(t('Shorter'), 'version:shorter', { minutes: '1' }),
          version(t('For children'), 'version:children', { audience: 'children' }),
          version(t('Original'), 'version:original', {
            level: null,
            minutes: null,
            audience: null,
          }),
        ]
      : []
    const all = [...expansion, ...versions, ...quick, ...searchable]
    // In a group the host decides where everyone goes: a guest keeps only
    // what changes their own reading and route (Tell me more, reading
    // options, wheelchair), never a step, destination or another modal.
    return guest ? all.filter(({ id }) => /^(more|version):/.test(id) || id === 'wheelchair') : all
  }, [
    lng,
    tour,
    step,
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
