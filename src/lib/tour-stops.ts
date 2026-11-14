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

/** The stops a tour needs: one for a personal tour, `MIN_TOUR_STOPS` otherwise. */
export function minStopsFor(tour: {
  generation?: { generated?: boolean | null } | null
  visitCopyOf?: unknown
}) {
  const personal = tour.generation?.generated === true || tour.visitCopyOf != null
  return personal ? 1 : MIN_TOUR_STOPS
}
