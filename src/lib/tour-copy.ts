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
