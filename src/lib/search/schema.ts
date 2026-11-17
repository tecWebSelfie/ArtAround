import { Errors } from 'typesense'
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
 *
 * `infix: true` on every searchable text field is required by the queries:
 * `query.ts` sends `infix: 'fallback'`, which asks Typesense for a substring
 * match whenever the prefix one found nothing. Without the index Typesense
 * answers 400 on exactly those queries (`q=milano` with no prefix match), so
 * the schema and the query must change together.
 */
const schema = {
  name: SEARCH_COLLECTION_NAME,
  default_sorting_field: 'priority',
  fields: [
    { name: 'source_id', type: 'string', facet: true },
    { name: 'kind', type: 'string', facet: true },
    { name: 'title', type: 'string', locale: 'en', infix: true },
    { name: 'excerpt', type: 'string', locale: 'en', infix: true, optional: true },
    { name: 'description', type: 'string', locale: 'en', infix: true, optional: true },
    { name: 'city', type: 'string', locale: 'en', facet: true, infix: true, optional: true },
    { name: 'museum_id', type: 'string[]', facet: true, optional: true },
    { name: 'museum_name', type: 'string', locale: 'en', infix: true, optional: true },
    // Scoped search pages (`?author=`, `?subject=`): one condition on an
    // indexed id keeps a scoped list the same ranked query as the unscoped one
    // (`src/lib/search-scope.ts`).
    { name: 'author_id', type: 'string', facet: true, optional: true },
    { name: 'subject_ids', type: 'string[]', facet: true, optional: true },
    { name: 'artist', type: 'string', locale: 'en', infix: true, optional: true },
    { name: 'difficulty', type: 'string', facet: true, optional: true },
    { name: 'duration_seconds', type: 'int32', optional: true },
    { name: 'price_cents', type: 'int32', facet: true, optional: true },
    { name: 'priority', type: 'int32', sort: true },
    { name: 'source_created_at', type: 'int64', sort: true, optional: true },
  ],
}

/**
 * Creates the collection the first time a process needs it.
 *
 * Typesense has no implicit schema, so a fresh Cloud cluster answers 404 until
 * `search_items` exists; without this, `pnpm seed` would save every document
 * while every hook write failed. Memoized per process: the check runs once, and
 * a failed attempt (cluster down) is retried on the next call instead of
 * caching the failure. A concurrent create (another worker seeded first) lands
 * on Typesense's "already exists" and counts as success.
 */
let ensuring: Promise<boolean> | null = null

async function createIfMissing() {
  const collections = typesense().collections()
  try {
    await typesense().collections(SEARCH_COLLECTION_NAME).retrieve()
    return false
  } catch (error) {
    if (!(error instanceof Errors.ObjectNotFound)) throw error
  }
  try {
    await collections.create(schema as Parameters<typeof collections.create>[0])
    return true
  } catch (error) {
    if (error instanceof Errors.ObjectAlreadyExists) return false
    throw error
  }
}

export function ensureSearchCollection() {
  ensuring ??= createIfMissing().catch((error: unknown) => {
    ensuring = null
    throw error
  })
  return ensuring
}

/** Drops the collection (reindex only). Missing collection is not an error. */
export async function dropSearchCollection() {
  try {
    await typesense().collections(SEARCH_COLLECTION_NAME).delete()
  } catch {
    // Nothing to drop on a fresh cluster.
  }
  // The memoized "already ensured" no longer describes the cluster: the
  // reindex that just dropped the collection must create it again.
  ensuring = null
}
