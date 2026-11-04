/**
 * Length of a content (an "item" in the course specification) in seconds.
 * Items are meant to be listened to as well as read, and the specification
 * expects anything from a few seconds ("La Gioconda, by Leonardo") to several
 * minutes, so the length is stored exactly (`contents.durationSeconds`), not
 * rounded to minutes.
 *
 * Until a content has its read-aloud audio (whose real length then replaces
 * the estimate), the length is estimated from the words at a calm speaking
 * pace. Tours, the planner and the version picker still reason in minutes:
 * `toMinutes` converts at those edges.
 */

/** Calm read-aloud pace, the one museum audio guides use. */
export const SPOKEN_WORDS_PER_MINUTE = 150

/** Words in a plain text (any whitespace separates them). */
export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

/** Estimated seconds to read the text aloud; at least 1 for any written text. */
export function estimateSeconds(text: string): number {
  const words = wordCount(text)
  return words ? Math.max(1, Math.round((words / SPOKEN_WORDS_PER_MINUTE) * 60)) : 0
}

/** Words that take about `seconds` to read aloud: the length asked of generated versions. */
export const wordsForSeconds = (seconds: number) =>
  Math.max(1, Math.round((seconds / 60) * SPOKEN_WORDS_PER_MINUTE))

/** Whole minutes for sums and budgets (tours, planner); never 0 for a real item. */
export const toMinutes = (seconds: number | null | undefined) =>
  seconds ? Math.max(1, Math.round(seconds / 60)) : 0

/**
 * Compact, language-neutral label in the app's chip style (DESIGN.md →
 * Chips): minutes with a prime and seconds with a double prime, as on
 * timetables — `15"`, `1'30"`, `5'`. Lengths of ten minutes or more drop the
 * seconds, which nobody plans by.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total}"`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest && minutes < 10 ? `${minutes}'${String(rest).padStart(2, '0')}"` : `${minutes}'`
}
