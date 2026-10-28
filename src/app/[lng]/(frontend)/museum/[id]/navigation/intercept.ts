import 'server-only'
import { headers } from 'next/headers'
import type { Route } from 'next'
import {
  museumNavigationPath,
  parseNavigationPathname,
  tourContentPath,
  tourNavigationPath,
  tourStepIndex,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { getNavigationTour } from './data'

type NavigationSearch = Record<string, string | string[] | undefined>

/**
 * Where an intercepted canonical `/[lng]/content/ID` or `/[lng]/object/ID`
 * (QR scan, in-map link) opens over the map the visitor came from, with
 * `at`/`to`/… kept.
 *
 * Interception rewrites match the intercepting route *and its descendants*,
 * so a second interceptor inside the tour tree would compete with the free
 * map's for the same canonical URL (the doc's "one interceptor per canonical
 * route" rule). There is therefore a single interceptor per canonical route,
 * in the museum navigation `@modal` slot, and it learns the exact map (free,
 * or a tour at its cursor) from the `Next-Url` header the App Router sends with
 * every soft navigation: its pathname is the page being left.
 *
 * Returns `null` when the visitor is not on a museum navigation URL (the
 * museum details page's own `@object` interceptor then shows its modal).
 */
export async function navigationModalTarget(
  kind: 'content' | 'object',
  id: string,
  search: NavigationSearch,
): Promise<Route | null> {
  const here = parseNavigationPathname((await headers()).get('next-url') ?? '')
  if (!here) return null
  const { lng, museumId, tourId, step: rawStep } = here
  const free = withNavigationPosition(
    `${museumNavigationPath(lng, museumId)}/${kind}/${id}`,
    search,
  )
  // Free map, or a tour's start page (no map yet): open it over the free map.
  if (!tourId || rawStep === null) return free
  const tour = await getNavigationTour(tourId).catch(() => null)
  const step = tour ? tourStepIndex(rawStep, tour.contents.length) : null
  if (!tour || step === null) return free
  // A tour's next stop opens as `/open`, any other content as `/content/ID`.
  const path =
    kind === 'content'
      ? tourContentPath(lng, tour, step, id)
      : `${tourNavigationPath(lng, museumId, tour.id, step)}/object/${id}`
  return withNavigationPosition(path, search)
}
