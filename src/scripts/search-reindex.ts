/**
 * Rebuilds the Typesense `search_items` collection from the current source
 * documents.
 *
 * Usage:
 *   pnpm search:reindex
 *
 * The Payload hooks keep the index up to date on normal saves. A full rebuild
 * is needed after the first setup, after changing the schema or the fields
 * stored by `buildSearchDocument()` (src/lib/search/documents.ts), or to repair
 * rows missed while Typesense was unreachable (docs/search.md).
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { reindexSearchIndex } from '../lib/search/reindex'

async function reindex() {
  const payload = await getPayload({ config })
  const { counts, failures } = await reindexSearchIndex(payload)
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  payload.logger.info(`Search reindex complete: ${total} row(s).`)
  if (failures.length > 0) process.exitCode = 1
}

try {
  // Top-level await is required: `payload run` exits as soon as the imported
  // module resolves, so a floating promise would be cut off.
  await reindex()
} catch (error) {
  console.error('Search reindex failed:', error)
  process.exit(1)
}
