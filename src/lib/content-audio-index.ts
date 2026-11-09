import type { Payload } from 'payload'

/** Upgrade only the obsolete audio uniqueness constraint; retain files and every other index. */
export async function ensureContentAudioVariantIndex(payload: Payload) {
  const collection = payload.db.collections.contentAudio.collection
  // A fresh database has no collection yet (NamespaceNotFound, code 26): there
  // is no old index to upgrade, and Payload creates the new one with it.
  const indexes = await collection.indexes().catch((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 26) return null
    throw error
  })
  if (!indexes) return
  // Install the replacement first, so an interrupted upgrade never removes uniqueness.
  if (
    !indexes.some(
      (index) =>
        index.unique &&
        Object.keys(index.key).length === 3 &&
        index.key.content === 1 &&
        index.key.locale === 1 &&
        index.key.variant === 1,
    )
  ) {
    await collection.createIndex({ content: 1, locale: 1, variant: 1 }, { unique: true })
  }
  for (const index of indexes) {
    const keys = Object.keys(index.key)
    if (index.unique && keys.length === 2 && keys.includes('content') && keys.includes('locale')) {
      await collection.dropIndex(index.name!).catch((error: unknown) => {
        // Multiple app/test workers can observe the old index before the first removes it.
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 27))
          throw error
      })
    }
  }
}
