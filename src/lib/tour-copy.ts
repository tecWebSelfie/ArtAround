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
