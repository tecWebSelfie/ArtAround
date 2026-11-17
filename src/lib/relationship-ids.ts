/**
 * Payload relationship values are either ids, populated documents, or `null`
 * entries, depending on `depth`. Lists that need the ids (translation requests,
 * search refreshes, the search projection) share this one normalisation, so the
 * shape never leaks into the callers.
 */
export function relationshipIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(idOf).filter((id): id is string => Boolean(id))
}

function idOf(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return null
}
