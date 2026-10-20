import type { Content, Object as MuseumObject, Tour } from '@/payload-types'
import { ItemNode } from '@pascal-app/core'
import type { Route } from 'next'

/** URL and Payload/Pascal adapters shared across the tour navigation route tree. */
export type NavigationCatalogObject = Pick<MuseumObject, 'id' | 'name'> & {
  contents: NavigationCatalogContent[]
}

/**
 * Content summary for navigation search and nearby suggestions. `locked` is
 * decided on the server (paid and the body withheld from this visitor, see
 * `isLocked`); the body itself never reaches the client. Both fields are
 * optional so summaries built without viewer access read as free.
 */
export type NavigationCatalogContent = Pick<Content, 'id' | 'title'> & {
  price?: number | null
  locked?: boolean
}

/** The cursor counts completed contents; count itself represents a finished tour. */
export function tourStepIndex(value: string, count: number): number | null {
  if (!/^\d+$/.test(value)) return null
  const step = Number(value)
  return Number.isSafeInteger(step) && step <= count ? step : null
}

export function tourNavigationPath(lng: string, tourId: string, step: number) {
  return `/${lng}/tour/${tourId}/navigation/${step}` as Route
}

/**
 * Free navigation: the museum's map with no tour. The visitor explores, picks
 * destinations and opens contents; the same modal, scanner and URL-state rules
 * as a tour apply, without a cursor (`/[lng]/museum/[id]/navigation`).
 */
export function museumNavigationPath(lng: string, museumId: string) {
  return `/${lng}/museum/${museumId}/navigation` as Route
}

/**
 * Which navigation the map is showing. A tour carries its ordered contents and
 * the cursor; free navigation only knows its museum. Every "where am I" path
 * (modal close, commands, scanner, object actions) derives from this.
 */
export type NavigationScope =
  | { kind: 'tour'; tour: Pick<Tour, 'id' | 'contents'>; step: number }
  | { kind: 'free'; museumId: string }

/** The map URL of the current navigation, without modal or search state. */
export function navigationBasePath(lng: string, scope: NavigationScope) {
  return scope.kind === 'tour'
    ? tourNavigationPath(lng, scope.tour.id, scope.step)
    : museumNavigationPath(lng, scope.museumId)
}

/** Where a content opens over the current map (the tour's next stop opens `/open`). */
export function navigationContentPath(lng: string, scope: NavigationScope, contentId: string) {
  return scope.kind === 'tour'
    ? tourContentPath(lng, scope.tour, scope.step, contentId)
    : (`${museumNavigationPath(lng, scope.museumId)}/content/${contentId}` as const)
}

/**
 * Keys that describe where the visitor stands or where they are heading, plus
 * `audience=children` (a family visit): carried across every navigation URL
 * so each content opens in its children's version (`ContentVersion`).
 */
export type NavigationKey = 'at' | 'to' | 'mobility' | 'service' | 'exit' | 'audience'

type NavigationSearch = Partial<Record<NavigationKey, string | string[]>>

/**
 * Destination keys are mutually exclusive: the URL carries at most one target,
 * so choosing a service or an exit replaces an object `to` (and vice versa).
 */
const DESTINATION_KEYS: NavigationKey[] = ['to', 'service', 'exit']

const NAVIGATION_KEYS: NavigationKey[] = ['at', 'to', 'mobility', 'service', 'exit', 'audience']

/** Carry shareable navigation state between canonical and contextual routes. */
export function withNavigationPosition(path: string, search: string | NavigationSearch) {
  const input = typeof search === 'string' ? new URLSearchParams(search) : search
  const output = new URLSearchParams()
  for (const key of NAVIGATION_KEYS) {
    const value = input instanceof URLSearchParams ? input.get(key) : input[key]
    const valid =
      key === 'mobility'
        ? value === 'wheelchair'
        : key === 'audience'
          ? value === 'children'
          : typeof value === 'string' && value
    if (valid) {
      output.set(key, value as string)
    }
  }
  return `${path}${output.size ? `?${output}` : ''}` as Route
}

/** Change one shareable position field while preserving the other URL state. */
export function withNavigationValue(
  path: string,
  search: string,
  key: NavigationKey,
  value: string | null,
) {
  const params = new URLSearchParams(search)
  if (value) params.set(key, value)
  else params.delete(key)
  if (DESTINATION_KEYS.includes(key)) {
    for (const other of DESTINATION_KEYS) if (other !== key) params.delete(other)
  }
  return withNavigationPosition(path, params.toString())
}

/**
 * Where the visitor asked to go. Objects come from the map's Payload IDs;
 * `service` / `exit` accept either a marker node id or a service type / the
 * literal `nearest`, which the map resolves to the closest placed marker.
 */
export type NavigationDestination =
  | { kind: 'object'; id: string }
  | { kind: 'service'; target: string }
  | { kind: 'exit'; target: string }

/** The single destination encoded in the URL, if the visitor chose one. */
export function navigationDestination(search: URLSearchParams): NavigationDestination | null {
  const to = search.get('to')
  if (to) return { kind: 'object', id: to }
  const service = search.get('service')
  if (service) return { kind: 'service', target: service }
  const exit = search.get('exit')
  if (exit) return { kind: 'exit', target: exit }
  return null
}

/** Shared by content links and intercepted canonical content routes. */
export function tourContentPath(
  lng: string,
  tour: Pick<Tour, 'id' | 'contents'>,
  step: number,
  contentId: string,
) {
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  return nextId === contentId
    ? (`${tourNavigationPath(lng, tour.id, step)}/open` as const)
    : (`${tourNavigationPath(lng, tour.id, step)}/content/${contentId}` as const)
}

/** Catalog placement preserves the Payload object ID in the asset. */
export function museumObjectId(node: unknown): string | null {
  const result = ItemNode.safeParse(node)
  return result.success && result.data.asset.category === 'museum-objects'
    ? result.data.asset.id
    : null
}

export function contentObjectId(content: Content): string | null {
  const object = content.objects?.docs?.[0]
  return typeof object === 'string' ? object : (object?.id ?? null)
}

/**
 * Quiz routes live beside, not inside, the navigation tree (no map). `from` is
 * the tour cursor the visitor left, so the quiz can warn about unvisited stops
 * and "back to the map" returns to the same step; `at`/`mobility` ride along.
 * The alternative destination (`to`) is dropped: the quiz ends that excursion.
 */
export function tourQuizPath(lng: string, tourId: string, from: number, search: string) {
  const params = new URLSearchParams(search)
  params.delete('to')
  const path = withNavigationPosition(`/${lng}/tour/${tourId}/quiz`, params.toString())
  return `${path}${path.includes('?') ? '&' : '?'}from=${from}` as Route
}

export function tourQuizResultPath(lng: string, tourId: string, token: string) {
  return `/${lng}/tour/${tourId}/quiz/result/${encodeURIComponent(token)}` as Route
}

/** Quiz question IDs are never populated on tours (`maxDepth: 0`), so a count is all we read. */
export function tourHasQuiz(tour: Pick<Tour, 'quiz'>) {
  return Boolean(tour.quiz?.questions?.length)
}
