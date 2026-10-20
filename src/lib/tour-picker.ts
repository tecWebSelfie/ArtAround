/**
 * The "add a stop" round trip between the tour editor and the contents search.
 *
 * The editor (`TourForm`) links to `/search/contents` in picker mode, carrying
 * the museum (only its exhibited contents can be stops), the stops already in
 * the draft (shown as "In the tour"), and where to come back. Picking a
 * content, or writing a new one on `/content/new`, returns to the editor with
 * `?add=<contentId>`; the editor restores its unsaved draft and appends it.
 *
 * Shared by server pages and client components, so no server-only imports.
 */

export const PICK_PARAM = 'pick'
export const ADD_PARAM = 'add'
/** On the editor URL: restore the unsaved draft (the visitor came back from picking). */
export const DRAFT_PARAM = 'draft'

export type TourPicker = {
  museumId: string
  /** The editor URL to return to (validated: a tour editor of this language). */
  returnTo: string
  /** Contents already in the draft, in order. */
  have: string[]
}

type Params = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Only a tour editor of the current language is a valid return target, so the
 * parameter can't be turned into an open redirect.
 */
export function safeTourReturnTo(lng: string, value: string | undefined): string | null {
  if (!value) return null
  const pattern = new RegExp(`^/${lng}/tour/(new|[A-Za-z0-9]+/edit)(\\?[^#]*)?$`)
  return pattern.test(value) ? value : null
}

/** Picker mode from the search page's query, or null for a plain search. */
export function parseTourPicker(lng: string, params: Params): TourPicker | null {
  if (first(params[PICK_PARAM]) !== 'tour') return null
  const museumId = first(params.museum)
  const returnTo = safeTourReturnTo(lng, first(params.returnTo))
  if (!museumId || !returnTo) return null
  const have = (first(params.have) ?? '').split(',').filter(Boolean)
  return { museumId, returnTo, have }
}

/** The picker's own parameters, kept on every URL the search page writes. */
export function tourPickerParams(picker: TourPicker): Record<string, string> {
  return {
    [PICK_PARAM]: 'tour',
    museum: picker.museumId,
    returnTo: picker.returnTo,
    ...(picker.have.length ? { have: picker.have.join(',') } : {}),
  }
}

/** `/search/contents` in picker mode. */
export function tourPickerHref(lng: string, picker: TourPicker) {
  return `/${lng}/search/contents?${new URLSearchParams(tourPickerParams(picker))}`
}

/** `/content/new` that returns to the editor with the new content added. */
export function newStopHref(lng: string, picker: Pick<TourPicker, 'museumId' | 'returnTo'>) {
  const params = new URLSearchParams({ museum: picker.museumId, returnTo: picker.returnTo })
  return `/${lng}/content/new?${params}`
}

/** The editor URL with its draft restored and, optionally, a content to append. */
export function backToTourHref(returnTo: string, contentId?: string) {
  const [path, query = ''] = returnTo.split('?')
  const params = new URLSearchParams(query)
  params.set(DRAFT_PARAM, '1')
  if (contentId) params.set(ADD_PARAM, contentId)
  return `${path}?${params}`
}
