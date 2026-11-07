/** Device-local reading choices: family members share stops, never their age. */
export function readingAge(value: string | null): number | undefined {
  if (value === null || !/^\d{1,2}$/.test(value)) return undefined
  const age = Number(value)
  return age <= 17 ? age : undefined
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
    ? [
        ...new Set(
          ages.filter((age): age is number => Number.isInteger(age) && age >= 0 && age <= 17),
        ),
      ].sort((a, b) => a - b)
    : []
}
