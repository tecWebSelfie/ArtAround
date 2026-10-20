/**
 * Rebuilds the Payload `search` collection from the current source documents.
 *
 * Usage:
 *   pnpm search:reindex
 *
 * The search plugin keeps the index up to date on normal saves. A full rebuild
 * is needed after enabling search, adding a collection, or changing the fields
 * stored by `buildSearchDoc()`.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { buildSearchDoc, SEARCH_PLUGIN_COLLECTIONS, SEARCH_PRIORITIES } from '../lib/search-index'

async function reindex() {
  const payload = await getPayload({ config })

  payload.logger.info('Clearing the search collection...')
  await payload.delete({ collection: 'search', where: {}, overrideAccess: true })

  let total = 0
  for (const collection of SEARCH_PLUGIN_COLLECTIONS) {
    const result = await payload.find({
      collection,
      depth: 0,
      locale: 'en',
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })

    payload.logger.info(`Indexing ${result.docs.length} ${collection} document(s)...`)
    for (const doc of result.docs) {
      const id = String(doc.id)
      const data = await buildSearchDoc({ payload, collection, id })
      await payload.create({
        collection: 'search',
        data: {
          ...data,
          doc: { relationTo: collection, value: id },
          priority: SEARCH_PRIORITIES[collection],
        },
        overrideAccess: true,
      })
      total += 1
    }
  }

  payload.logger.info(`Search reindex complete: ${total} row(s).`)
}

try {
  // Top-level await is required: `payload run` exits as soon as the imported
  // module resolves, so a floating promise would be cut off.
  await reindex()
} catch (error) {
  console.error('Search reindex failed:', error)
  process.exit(1)
}
