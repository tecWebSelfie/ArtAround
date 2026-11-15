import type { Payload } from 'payload'
import { searchCollection } from './client'
import { buildSearchDocument, isUnlistedInSearch } from './documents'
import { dropSearchCollection, ensureSearchCollection } from './schema'
import { SEARCH_COLLECTIONS, type SearchDocument } from './types'

/**
 * Full rebuild of the Typesense index from Payload (`pnpm search:reindex`).
 *
 * Hooks keep the index in step on normal saves; this script repairs drift,
 * applies a schema change and seeds the collection (and the local Docker
 * Typesense) for the first time. It drops the collection, so it is safe to run
 * whenever: every document is rebuilt from its source.
 *
 * The projection is the same `buildSearchDocument` the hooks use, so a rebuilt
 * row and a hook-written row always have the same shape.
 */

const IMPORT_CHUNK = 100
const PAGE_SIZE = 200

export async function reindexSearchIndex(payload: Payload) {
  payload.logger.info('Dropping the search collection...')
  await dropSearchCollection()
  await ensureSearchCollection()

  const counts: Record<string, number> = {}
  const failures: string[] = []

  for (const collection of SEARCH_COLLECTIONS) {
    let page = 1
    let indexed = 0
    while (true) {
      const result = await payload.find({
        collection,
        depth: 0,
        locale: 'en',
        page,
        limit: PAGE_SIZE,
        overrideAccess: true,
        pagination: true,
      })

      const batch: SearchDocument[] = []
      for (const doc of result.docs) {
        // Same rule as live syncing: private documents and planned visits
        // never get a row.
        if (isUnlistedInSearch(doc)) continue
        const document = await buildSearchDocument({
          payload,
          collection,
          id: String(doc.id),
          source: doc as unknown as Record<string, unknown>,
        })
        if (document) batch.push(document)
      }

      for (let start = 0; start < batch.length; start += IMPORT_CHUNK) {
        const chunk = batch.slice(start, start + IMPORT_CHUNK)
        const imported = await searchCollection().documents().import(chunk, { action: 'upsert' })
        for (const entry of imported) {
          if (entry.success) indexed += 1
          else failures.push(`${collection}:${entry.id ?? '?'} — ${entry.error}`)
        }
      }

      if (!result.hasNextPage) break
      page += 1
    }

    counts[collection] = indexed
    payload.logger.info(`Indexed ${indexed} ${collection} document(s).`)
  }

  payload.logger.info(`Search reindex complete: ${JSON.stringify(counts)}`)
  if (failures.length > 0) {
    payload.logger.error({ msg: `Search reindex failures (${failures.length})`, failures })
  }
  return { counts, failures }
}
