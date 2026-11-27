import { directionsByStop } from '@/lib/tour-logistics'
import type { Tour } from '@/payload-types'

/**
 * What a copy of someone's tour starts with (`/tour/new?from=<id>`, customize
 * or visit copy). The copy's author is the visitor, so it keeps only the stops
 * the visitor can keep and visit, silently: unavailable ones (content gone,
 * about no object, object off the museum map) and contents the visitor can't
 * read or that are another author's private ones (`guardTourContents` would
 * refuse them on save, and nobody else could open them). Pure, so the
 * filtering is testable without a request.
 */
export function copyableStops({
  stopIds,
  candidateIds,
  contents,
  viewerId,
}: {
  /** The original's stops, in order. */
  stopIds: string[]
  /** Contents of the museum map's objects the visitor can read (`getTourEditorData`). */
  candidateIds: ReadonlySet<string>
  /** Visibility and author of the stops that are candidates, read as the visitor. */
  contents: { id: string; visibility?: string | null; author: string }[]
  viewerId: string
}): string[] {
  const keepable = new Set(
    contents
      .filter(
        (content) =>
          content.visibility !== 'private' || (viewerId !== '' && content.author === viewerId),
      )
      .map((content) => content.id),
  )
  return stopIds.filter((id) => candidateIds.has(id) && keepable.has(id))
}

/** The original's directions for the stops the copy kept: a dropped stop's note goes with it. */
export function copiedDirections(source: Pick<Tour, 'directions'>, kept: string[]) {
  const keptIds = new Set(kept)
  return Object.fromEntries(
    Object.entries(directionsByStop(source)).filter(([id]) => keptIds.has(id)),
  )
}

/**
 * The stops an anonymous visitor's copy may keep (`/api/tour-copy`): the
 * order they sent, if every one is a candidate of the museum read as that
 * visitor (`getTourEditorData`: public contents of the works its map
 * exhibits) and none repeats; null refuses the whole request, so a crafted
 * body can't slip in a stop the editor never offered.
 */
export function anonymousCopyStops(
  requested: string[],
  candidates: { id: string; unavailable?: boolean }[],
): string[] | null {
  const allowed = new Set(candidates.filter((c) => !c.unavailable).map((c) => c.id))
  if (!requested.length || new Set(requested).size !== requested.length) return null
  return requested.every((id) => allowed.has(id)) ? requested : null
}

/**
 * The original's directions an anonymous copy may keep (`/api/tour-copy`):
 * that editor can reorder stops but can't see or edit directions, and a
 * note says how to reach its stop from the one before it (the entrance for
 * the first). So a note survives only when its stop's predecessor is the
 * same as in the original; the others are dropped and the map's route
 * guides the visitor instead of a note that now points the wrong way.
 */
export function reorderedDirections(
  originalStops: string[],
  copyStops: string[],
  directions: Record<string, string>,
): Record<string, string> {
  const before = (stops: string[], id: string) => stops[stops.indexOf(id) - 1] ?? null
  return Object.fromEntries(
    copyStops.flatMap((id) =>
      directions[id] &&
      originalStops.includes(id) &&
      before(originalStops, id) === before(copyStops, id)
        ? [[id, directions[id]]]
        : [],
    ),
  )
}
