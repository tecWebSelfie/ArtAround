import { toMinutes } from '@/lib/duration'
import { filterPopulated, isPopulated } from '@/lib/isPopulated'
import type { Picture } from '@/lib/picture'
import type { Content, Difficulty, Tour } from '@/payload-types'

/**
 * The "tour at a glance" figures shared by the tour page and the museum's tour
 * carousel. Everything is derived from data the tour already carries (its
 * populated contents and the planner's optional estimates), so no surface has
 * to invent numbers: a figure that cannot be computed is simply `null`.
 */
export type TourSummary = {
  stops: number
  /** Sum of the stops' lengths (`durationSeconds`) in minutes; null when no stop has one. */
  readingMinutes: number | null
  /** The planner's visit estimate when present, else the reading time. */
  visitMinutes: number | null
  distanceMeters: number | null
  wheelchairAccessible: boolean
  quizQuestions: number
  /** Stops per difficulty, in easy → hard order, zero counts omitted. */
  difficulties: { difficulty: Difficulty; count: number }[]
  /** The ratings average when at least one visitor rated the tour. */
  rating: { average: number; count: number } | null
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']

export function summarizeTour(tour: Tour): TourSummary {
  const contents = filterPopulated<Content>(tour.contents)
  const timed = contents.filter((content) => content.durationSeconds != null)
  const readingMinutes = timed.length
    ? toMinutes(timed.reduce((sum, content) => sum + (content.durationSeconds ?? 0), 0))
    : null
  const ratingsCount = tour.lfrs?.ratingsCount ?? 0

  return {
    // Unpopulated relations still count as stops: the order is the tour.
    stops: tour.contents?.length ?? 0,
    readingMinutes,
    visitMinutes: tour.durationMinutes ?? readingMinutes,
    distanceMeters: tour.distanceMeters ?? null,
    wheelchairAccessible: Boolean(tour.wheelchairAccessible),
    quizQuestions: tour.quiz?.questions?.length ?? 0,
    difficulties: DIFFICULTY_ORDER.map((difficulty) => ({
      difficulty,
      count: contents.filter((content) => content.difficulty === difficulty).length,
    })).filter(({ count }) => count > 0),
    rating:
      ratingsCount > 0 && tour.lfrs?.ratingsAverage != null
        ? { average: tour.lfrs.ratingsAverage, count: ratingsCount }
        : null,
  }
}

/**
 * The picture that represents a stop: the content's own first image, else the
 * thumbnail of the work it talks about (`withStopObjects` fills those in on
 * server reads). Null when neither is populated, so the caller can show the
 * content icon instead of a stock placeholder.
 */
export function stopPicture(content: Content): (Picture & { alt?: string | null }) | null {
  const image = content.images?.find(isPopulated)
  if (image?.url) return image
  for (const object of content.objects?.docs ?? []) {
    if (isPopulated(object) && isPopulated(object.thumbnail) && object.thumbnail.url) {
      return { ...object.thumbnail, alt: object.thumbnail.alt ?? object.name }
    }
  }
  return null
}

/** `stopPicture` as a list thumbnail: its small URL and alt text. */
export function stopImage(content: Content): { url: string; alt: string } | null {
  const picture = stopPicture(content)
  return picture?.url ? { url: picture.thumbnailURL ?? picture.url, alt: picture.alt ?? '' } : null
}
