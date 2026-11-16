import type { Route } from 'next'

/**
 * URL builders for museum navigation and the tour editor, with no
 * dependencies: client components that only need a URL (the tour editor)
 * import them from here without pulling in `tour-navigation`'s Pascal map
 * adapters. `tour-navigation` re-exports them for its existing callers.
 */

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

/** The editor of an existing tour (its author's). */
export function tourEditPath(lng: string, tourId: string) {
  return `/${lng}/tour/${tourId}/edit` as Route
}

/** Query flag on `/tour/new?from=<id>`: a visit copy (`tours.visitCopyOf`). */
export const VISIT_COPY_PARAM = 'visit'

/**
 * The editor for a new tour copied from `tourId` (the original never
 * changes): "Customize tour" on the tour page, or, with `visit`, the start
 * page's "Edit".
 */
export function tourCopyPath(lng: string, tourId: string, { visit = false } = {}) {
  return `/${lng}/tour/new?from=${tourId}${visit ? `&${VISIT_COPY_PARAM}=1` : ''}` as Route
}
