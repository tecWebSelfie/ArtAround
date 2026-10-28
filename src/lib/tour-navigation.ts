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

/**
 * Free navigation: the museum's map with no tour. The visitor explores, picks
 * destinations and opens contents; the same modal, scanner and URL-state rules
 * as a tour apply, without a cursor (`/[lng]/museum/[id]/navigation`).
 */
export function museumNavigationPath(lng: string, museumId: string) {
  return `/${lng}/museum/${museumId}/navigation` as Route
}

/**
 * Tours live inside their museum's navigation (`…/navigation/tour/[tourId]`),
 * so one persistent shell serves free navigation and every tour of the museum
 * and the map stays mounted when a tour starts. This is the tour's start page
 * (no cursor yet); the old `/[lng]/tour/[id]/navigation/...` URLs redirect here.
 */
export function tourStartPath(lng: string, museumId: string, tourId: string) {
  return `${museumNavigationPath(lng, museumId)}/tour/${tourId}` as Route
}

/** The tour map at cursor `step` (completed stops). */
export function tourNavigationPath(lng: string, museumId: string, tourId: string, step: number) {
  return `${tourStartPath(lng, museumId, tourId)}/${step}` as Route
}

/** A tour's museum id, whether its `museum` relationship is populated or not. */
export function tourMuseumId(tour: Pick<Tour, 'museum'>) {
  return typeof tour.museum === 'string' ? tour.museum : tour.museum.id
}

/**
 * Where a navigation pathname stands: the museum, and the tour and raw cursor
 * when it is a tour URL (the cursor is validated by `tourStepIndex` against the
 * tour). `null` outside the museum navigation tree. Interceptors use it on the
 * `Next-Url` header to send a canonical object/content URL into the map the
 * visitor came from.
 */
export function parseNavigationPathname(pathname: string) {
  const match =
    /^\/([^/]+)\/museum\/([^/]+)\/navigation(?:\/tour\/([^/]+)(?:\/([^/]+))?)?(?:\/|$)/.exec(
      pathname,
    )
  if (!match) return null
  const [, lng, museumId, tourId, step] = match
  return { lng, museumId, tourId: tourId ?? null, step: step ?? null }
}

/**
 * Which navigation the map is showing. A tour carries its ordered contents and
 * the cursor; free navigation only knows its museum. Every "where am I" path
 * (modal close, commands, scanner, object actions) derives from this.
 */
export type NavigationScope =
  | { kind: 'tour'; tour: Pick<Tour, 'id' | 'contents' | 'museum'>; step: number }
  | { kind: 'free'; museumId: string }

/** The map URL of the current navigation, without modal or search state. */
export function navigationBasePath(lng: string, scope: NavigationScope) {
  return scope.kind === 'tour'
    ? tourNavigationPath(lng, tourMuseumId(scope.tour), scope.tour.id, scope.step)
    : museumNavigationPath(lng, scope.museumId)
}

/** Where a content opens over the current map (the tour's next stop opens `/open`). */
export function navigationContentPath(lng: string, scope: NavigationScope, contentId: string) {
  return scope.kind === 'tour'
    ? tourContentPath(lng, scope.tour, scope.step, contentId)
    : (`${museumNavigationPath(lng, scope.museumId)}/content/${contentId}` as const)
}

/**
 * The one rule for "this object/content over the current map": interceptors
 * (`intercept.ts`), the scanner and in-text links all build their in-map URL
 * here, never the canonical `/[lng]/{kind}/ID` (see docs/tour-navigation.md
 * on the museum details `@object` interceptor).
 */
export function navigationDetailPath(
  lng: string,
  scope: NavigationScope,
  kind: 'content' | 'object',
  id: string,
) {
  return kind === 'content'
    ? navigationContentPath(lng, scope, id)
    : (`${navigationBasePath(lng, scope)}/object/${id}` as const)
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
  tour: Pick<Tour, 'id' | 'contents' | 'museum'>,
  step: number,
  contentId: string,
) {
  const next = tour.contents[step]
  const nextId = typeof next === 'string' ? next : next?.id
  const base = tourNavigationPath(lng, tourMuseumId(tour), tour.id, step)
  return nextId === contentId
    ? (`${base}/open` as const)
    : (`${base}/content/${contentId}` as const)
}

/** Catalog placement preserves the Payload object ID in the asset. */
export function museumObjectId(node: unknown): string | null {
  const result = ItemNode.safeParse(node)
  return result.success && result.data.asset.category === 'museum-objects'
    ? result.data.asset.id
    : null
}

/**
 * Payload object IDs placed on a parsed museum map: the single rule for which
 * objects visitors can reach (catalog, Locate action, unavailable stops).
 */
export function placedObjectIds(map: { nodes: Record<string, unknown> } | null | undefined) {
  const ids = new Set<string>()
  for (const node of Object.values(map?.nodes ?? {})) {
    const id = museumObjectId(node)
    if (id) ids.add(id)
  }
  return ids
}

export function contentObjectId(content: Content): string | null {
  const object = content.objects?.docs?.[0]
  return typeof object === 'string' ? object : (object?.id ?? null)
}

/**
 * The object a tour stop leads to: the catalog object that lists the content
 * (`objects.contents`, the authored relation), else the content's own first
 * object. `null` for a stop that arrived unpopulated (deleted or unreadable).
 */
export function stopObjectId(
  content: Tour['contents'][number] | undefined,
  catalog: readonly NavigationCatalogObject[],
): string | null {
  if (!content || typeof content === 'string') return null
  return (
    catalog.find((object) => object.contents.some((entry) => entry.id === content.id))?.id ??
    contentObjectId(content)
  )
}

/**
 * Stops the visitor can no longer visit: the content is gone (unpopulated),
 * is about no object, or its object is not placed on the museum map any more.
 * The tour keeps them (its author decides), navigation flags and skips them.
 * Returned as cursor indexes into `contents`.
 */
export function unavailableStops(
  contents: Tour['contents'],
  catalog: readonly NavigationCatalogObject[],
  placedObjectIds: ReadonlySet<string>,
): Set<number> {
  const skipped = new Set<number>()
  contents.forEach((content, index) => {
    const objectId = stopObjectId(content, catalog)
    if (!objectId || !placedObjectIds.has(objectId)) skipped.add(index)
  })
  return skipped
}

/**
 * Where the cursor lands after skipping the unavailable stops from `step` on:
 * the next visitable stop, or `contents.length` (tour completed).
 */
export function nextVisitableStep(step: number, count: number, skipped: ReadonlySet<number>) {
  let next = step
  while (next < count && skipped.has(next)) next++
  return next
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

/**
 * Where moving the cursor to `toStep` leads, keeping the position and dropping
 * the `to` excursion: the map at that step or, when it completes a tour with a
 * quiz, the quiz (its final step). `quiz` tells callers to push, not replace.
 */
export function tourAdvanceHref(
  lng: string,
  tour: Pick<Tour, 'id' | 'contents' | 'quiz' | 'museum'>,
  toStep: number,
  search: string,
): { href: Route; quiz: boolean } {
  const params = new URLSearchParams(search)
  params.delete('to')
  if (toStep === tour.contents.length && tourHasQuiz(tour)) {
    return { href: tourQuizPath(lng, tour.id, toStep, params.toString()), quiz: true }
  }
  return {
    href: withNavigationPosition(
      tourNavigationPath(lng, tourMuseumId(tour), tour.id, toStep),
      params.toString(),
    ),
    quiz: false,
  }
}

/** Quiz question IDs are never populated on tours (`maxDepth: 0`), so a count is all we read. */
export function tourHasQuiz(tour: Pick<Tour, 'quiz'>) {
  return Boolean(tour.quiz?.questions?.length)
}
