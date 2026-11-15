import { SEARCH_COLLECTION_NAME, typesense } from './client'

/**
 * Typesense schema of the single search collection.
 *
 * `title`, `excerpt` and `city` are the cross-collection fields the navigator
 * searches; `description` is filled only for tours and objects (a content body
 * is never indexed); `museum_id` carries every museum a document belongs to,
 * so museum mode is one `filter_by` instead of a list of ids.
 *
 * Text fields are indexed as English (`locale: 'en'`) on purpose: matching stays
 * stable, while result cards are hydrated from Payload in the visitor's locale.
 */
const schema = {
  name: SEARCH_COLLECTION_NAME,
  default_sorting_field: 'priority',
  fields: [
    { name: 'source_id', type: 'string', facet: true },
    { name: 'kind', type: 'string', facet: true },
    { name: 'title', type: 'string', locale: 'en' },
    { name: 'excerpt', type: 'string', locale: 'en', optional: true },
    { name: 'description', type: 'string', locale: 'en', optional: true },
    { name: 'city', type: 'string', locale: 'en', facet: true, optional: true },
    { name: 'museum_id', type: 'string[]', facet: true, optional: true },
    { name: 'museum_name', type: 'string', locale: 'en', optional: true },
    { name: 'artist', type: 'string', locale: 'en', optional: true },
    { name: 'difficulty', type: 'string', facet: true, optional: true },
    { name: 'duration_seconds', type: 'int32', optional: true },
    { name: 'price_cents', type: 'int32', facet: true, optional: true },
    { name: 'priority', type: 'int32', sort: true },
    { name: 'source_created_at', type: 'int64', sort: true, optional: true },
  ],
}

/**
 * Creates the collection when it does not exist. Idempotent, so the reindex
 * script and a fresh local setup can call it unconditionally.
 */
export async function ensureSearchCollection() {
  const collections = typesense().collections()
  try {
    await typesense().collections(SEARCH_COLLECTION_NAME).retrieve()
    return false
  } catch {
    await collections.create(schema as Parameters<typeof collections.create>[0])
    return true
  }
}

/** Drops the collection (reindex only). Missing collection is not an error. */
export async function dropSearchCollection() {
  try {
    await typesense().collections(SEARCH_COLLECTION_NAME).delete()
  } catch {
    // Nothing to drop on a fresh cluster.
  }
}
