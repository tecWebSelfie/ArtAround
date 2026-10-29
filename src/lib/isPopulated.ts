type UnpopulatedId = string | number

/**
 * Narrows a Payload relationship / upload value (`string | Doc`) to the
 * populated document. Unpopulated IDs, `null` and `undefined` return `false`.
 */
export function isPopulated<T>(value: UnpopulatedId | T | null | undefined): value is T {
  return typeof value === 'object' && value !== null
}

/**
 * Filters a `hasMany` / join-docs array down to populated documents only.
 * Accepts `null` / `undefined` and returns `[]` in that case.
 */
export function filterPopulated<T>(
  values: readonly (UnpopulatedId | T | null | undefined)[] | null | undefined,
): T[] {
  if (!values) {
    return []
  }
  return values.filter((v): v is T => isPopulated(v))
}
