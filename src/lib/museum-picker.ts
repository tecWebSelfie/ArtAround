/**
 * The "add an object to the museum" round trip between the map editor and the
 * objects search (the sibling of `tour-picker.ts`).
 *
 * An object is in a museum when it is placed on its map (`museums.objects` is
 * derived from the saved scene), so the map editor's catalog links to
 * `/search/objects` in picker mode: the whole catalog with filters, objects
 * already on show marked, the others offered with "Place on the map". Picking
 * returns to the editor with `?place=<objectId>` (the object is put in hand,
 * ready for a click on the map); "Create a new object" returns with
 * `?create=1` (the editor opens its model-generation modal). Pascal autosaves
 * the scene and flushes on exit, so leaving the editor loses nothing.
 *
 * Shared by server pages and client components, so no server-only imports.
 */

export const PLACE_PARAM = 'place'
export const CREATE_PARAM = 'create'

export type MuseumPicker = {
  museumId: string
  /** The map editor of `museumId` (validated, never another URL). */
  returnTo: string
}

type Params = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const mapEditorPath = (lng: string, museumId: string) => `/${lng}/museum/${museumId}/edit/mapeditor`

/** Picker mode from the objects search query, or null for a plain search. */
export function parseMuseumPicker(lng: string, params: Params): MuseumPicker | null {
  if (first(params.pick) !== 'museum') return null
  const museumId = first(params.museum)
  // The return target is rebuilt from the museum id rather than taken from
  // the query, so the parameter can't become an open redirect.
  if (!museumId || !/^[A-Za-z0-9]+$/.test(museumId)) return null
  return { museumId, returnTo: mapEditorPath(lng, museumId) }
}

export function museumPickerParams(picker: MuseumPicker): Record<string, string> {
  return { pick: 'museum', museum: picker.museumId }
}

/** `/search/objects` in picker mode, from the map editor. */
export function museumPickerHref(lng: string, museumId: string) {
  return `/${lng}/search/objects?${new URLSearchParams({ pick: 'museum', museum: museumId })}`
}

/** Back to the map editor with the object in hand. */
export function placeOnMapHref(picker: MuseumPicker, objectId: string) {
  return `${picker.returnTo}?${new URLSearchParams({ [PLACE_PARAM]: objectId })}`
}

/** Back to the map editor with the new-object modal open. */
export function createObjectHref(picker: MuseumPicker) {
  return `${picker.returnTo}?${CREATE_PARAM}=1`
}
