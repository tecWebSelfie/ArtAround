/**
 * How many stops a tour needs, shared by the tour editor (`TourForm`) and the
 * collection's own validation (`Tours.ts`), so the form never accepts what
 * the server refuses.
 *
 * A tour is a route between works: one stop is a single content, not a
 * tour, so a tour someone composes has at least two. Personal tours are the
 * exception and keep one: a planned visit (`generation.generated`, which a
 * tight time budget can bring down to the one work that fits) and a visit
 * copy (`visitCopyOf`, a visitor trimming someone's tour to what they will
 * see). Neither is ever listed (`LISTED_TOURS`), so no visitor browses a
 * one-stop "tour".
 */
export const MIN_TOUR_STOPS = 2

/**
 * One visitor's own tour: a planned visit or a visit copy. The predicate form
 * of `LISTED_TOURS` (`src/lib/visibility.ts`, which re-exports it): such tours
 * are never listed, and may keep a single stop.
 */
export const isPersonalTour = (doc: unknown) => {
  const tour = doc as {
    generation?: { generated?: boolean | null } | null
    visitCopyOf?: unknown
  } | null
  return tour?.generation?.generated === true || tour?.visitCopyOf != null
}

/** The stops a tour needs: one for a personal tour, `MIN_TOUR_STOPS` otherwise. */
export const minStopsFor = (tour: unknown) => (isPersonalTour(tour) ? 1 : MIN_TOUR_STOPS)

/**
 * A tour with no visitable stop (`visitableStops` is 0, kept by
 * `src/lib/visitable-stops.ts`): the predicate form of the `visitableStops`
 * clause of `LISTED_TOURS`. A tour with no stored count yet (not backfilled)
 * is not empty: lists fail open on a missing value.
 */
export const isEmptyTour = (doc: unknown) =>
  (doc as { visitableStops?: number | null } | null)?.visitableStops === 0
