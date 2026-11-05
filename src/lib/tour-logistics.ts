import type { Tour } from '@/payload-types'

/**
 * Logistic directions of a tour (course specification: the visit is a
 * sequence of items *plus* logistic directions, which are neither items nor
 * part of one). Two kinds, both written by the tour's author:
 *
 * - `logistics`: the visit's practical information (entrance, tickets,
 *   cloakroom), read before the first stop;
 * - `directions`: per stop, how to reach it from the previous one
 *   ("continue left of the stairs towards room 12"), keyed by the stop's
 *   content so reordering the stops keeps each note with its stop.
 *
 * Navigation shows them beside the map's computed route, which knows rooms
 * and doors but not the building's practicalities.
 */

type TourLogistics = Pick<Tour, 'logistics' | 'directions' | 'contents'>

const idOf = (value: string | { id: string }) => (typeof value === 'string' ? value : value.id)

/** The author's note on how to reach `contentId`, if any. */
export function stopDirections(tour: Pick<Tour, 'directions'>, contentId: string) {
  const row = tour.directions?.find((entry) => idOf(entry.content) === contentId)
  return row?.text?.trim() || null
}

/**
 * The notes for the visitor heading to stop `step`: the practical
 * information first when it is the first stop, then how to reach it.
 */
export function logisticNotes(tour: TourLogistics, step: number): string[] {
  const stop = tour.contents[step]
  return [
    step === 0 ? tour.logistics?.trim() : null,
    stop ? stopDirections(tour, idOf(stop)) : null,
  ].filter((note): note is string => Boolean(note))
}

/** `directions` rows for the stops still in the tour, empty notes dropped. */
export function keptDirections(
  directions: Tour['directions'],
  contents: (string | { id: string })[],
) {
  const stops = new Set(contents.map(idOf))
  return (directions ?? []).filter((row) => row.text?.trim() && stops.has(idOf(row.content)))
}

/** `directions` as the tour editor holds them: note by stop (content id). */
export function directionsByStop(tour: Pick<Tour, 'directions'>): Record<string, string> {
  return Object.fromEntries(
    (tour.directions ?? []).map((row) => [idOf(row.content), row.text ?? '']),
  )
}
