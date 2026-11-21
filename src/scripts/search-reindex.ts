/**
 * Rebuilds the Typesense search collection from the current source
 * documents.
 *
 * Usage:
 *   pnpm search:reindex
 *
 * The Payload hooks keep the index up to date on normal saves, and the
 * collection is created automatically on first use, so a normal `pnpm seed`
 * fills it. A full rebuild is only needed after a schema or projection change
 * (`src/lib/search/documents.ts`), after a database restore (which does not fire
 * the hooks), or to repair rows missed while Typesense was unreachable
 * (docs/search.md).
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
  // The standalone bundle has no CLI around it to exit: mongoose and the
  // plugins keep handles open, so the process must end itself.
  process.exit(process.exitCode ?? 0)
} catch (error) {
  console.error('Search reindex failed:', error)
  process.exit(1)
}
