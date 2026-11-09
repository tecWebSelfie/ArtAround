import type { Payload } from 'payload'

/** A MongoDB driver error with this numeric `code`. */
const hasCode = (error: unknown, code: number) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code

/** An index over exactly these fields, in any order. */
const onFields = (index: { key: Record<string, unknown> }, fields: string[]) => {
  const keys = Object.keys(index.key)
  return keys.length === fields.length && fields.every((field) => keys.includes(field))
}

/** Upgrade only the obsolete audio uniqueness constraint; retain files and every other index. */
export async function ensureContentAudioVariantIndex(payload: Payload) {
  const collection = payload.db.collections.contentAudio.collection
  // A fresh database has no collection yet (NamespaceNotFound, code 26): there
  // is no old index to upgrade, and Payload creates the new one with it.
  const indexes = await collection.indexes().catch((error: unknown) => {
    if (hasCode(error, 26)) return null
    throw error
  })
  if (!indexes) return
  // Install the replacement first, so an interrupted upgrade never removes uniqueness.
  if (!indexes.some((index) => index.unique && onFields(index, ['content', 'locale', 'variant']))) {
    await collection.createIndex({ content: 1, locale: 1, variant: 1 }, { unique: true })
  }
  for (const index of indexes) {
    if (index.unique && onFields(index, ['content', 'locale'])) {
      await collection.dropIndex(index.name!).catch((error: unknown) => {
        // Multiple app/test workers can observe the old index before the first removes it
        // (IndexNotFound, code 27).
        if (!hasCode(error, 27)) throw error
      })
    }
  }
}
