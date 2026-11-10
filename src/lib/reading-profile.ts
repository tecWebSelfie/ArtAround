import { z } from 'zod'

/** Oldest age read as a child: 18 and over read the authored base content. */
export const MAX_CHILD_AGE = 17

/** A child's age, wherever it is validated (requests, planner answers). */
export const ChildAge = z.number().int().min(0).max(MAX_CHILD_AGE)

/** Device-local reading choices: family members share stops, never their age. */
export function readingAge(value: string | null): number | undefined {
  if (value === null || !/^\d{1,2}$/.test(value)) return undefined
  const age = Number(value)
  return age <= MAX_CHILD_AGE ? age : undefined
}

/** The reader picked among a family's planned ages: an age as text, else `'adult'`. */
export function readerFor(value: string | null, ages: readonly number[]): string {
  const age = readingAge(value)
  return age !== undefined && ages.includes(age) ? String(age) : 'adult'
}

/** A child profile is explicit; adults keep the authored base content. */
export function setReadingProfile(query: URLSearchParams, value: string) {
  const age = readingAge(value)
  if (age === undefined) {
    query.delete('age')
    query.delete('audience')
  } else {
    query.set('age', String(age))
    query.set('audience', 'children')
  }
}

/** Only the planned ages reach the join form, never the visitor's interests. */
export function plannedChildrenAges(request: unknown): number[] {
  if (!request || typeof request !== 'object' || !('childrenAges' in request)) return []
  const ages = request.childrenAges
  return Array.isArray(ages)
    ? [...new Set(ages.filter((age): age is number => ChildAge.safeParse(age).success))].sort(
        (a, b) => a - b,
      )
    : []
}
