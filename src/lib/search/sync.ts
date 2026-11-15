import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload'
import { searchCollection } from './client'
import { buildSearchDocument, isUnlistedInSearch } from './documents'
import { SEARCH_KIND_BY_COLLECTION, type SearchCollection, type SearchDocument } from './types'

/**
 * Keeps Typesense in step with Payload.
 *
 * Every hook is fail-soft: search is derived data, so a Typesense outage logs
 * and never rolls back a save. A full rebuild (`pnpm search:reindex`) repairs
 * anything a failed write missed.
 */

function documentId(collection: SearchCollection, id: string) {
  return `${SEARCH_KIND_BY_COLLECTION[collection]}_${id}`
}

export async function removeSearchDocument(
  payload: Payload,
  collection: SearchCollection,
  id: string,
) {
  try {
    await searchCollection().documents(documentId(collection, id)).delete()
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Could not delete the search document for ${collection}:${id}`,
    })
  }
}

async function upsert(payload: Payload, document: SearchDocument) {
  try {
    await searchCollection().documents().upsert(document)
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Could not index the search document ${document.id}`,
    })
  }
}

/**
 * Indexes (or removes) one source document. `source` is the document the hook
 * just saved: passing it avoids a second read and lets the unlisted rule run on
 * the exact data that was written.
 */
export async function syncSearchDocument({
  payload,
  collection,
  id,
  source,
  req,
}: {
  payload: Payload
  collection: SearchCollection
  id: string
  source?: Record<string, unknown>
  req?: PayloadRequest
}) {
  if (source && isUnlistedInSearch(source)) {
    await removeSearchDocument(payload, collection, id)
    return
  }
  const document = await buildSearchDocument({ payload, collection, id, req, source })
  if (!document) {
    // Gone between the save and the projection: no stale row may survive.
    await removeSearchDocument(payload, collection, id)
    return
  }
  await upsert(payload, document)
}

/**
 * Refreshes a set of documents after a dependent change (a museum rename, a
 * content price). Used by the collection hooks that used to call
 * `refreshSearchDocs`.
 */
export async function resyncSearchDocuments({
  payload,
  collection,
  ids,
  req,
}: {
  payload: Payload
  collection: SearchCollection
  ids: string[]
  req?: PayloadRequest
}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  for (const id of uniqueIds) {
    try {
      const source = (await payload.findByID({
        collection,
        id,
        depth: 0,
        locale: 'en',
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>
      await syncSearchDocument({ payload, collection, id, source, req })
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: `Could not refresh the search document for ${collection}:${id}`,
      })
    }
  }
}

/**
 * The `afterChange` / `afterDelete` pair every indexed collection installs:
 * one upsert or delete per save, nothing for the collection itself to
 * remember. The save never fails because of search (see `upsert`).
 */
export function searchSyncAfterChange(collection: SearchCollection): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    await syncSearchDocument({
      payload: req.payload,
      collection,
      id: String(doc.id),
      source: doc as unknown as Record<string, unknown>,
      req,
    })
    return doc
  }
}

export function searchSyncAfterDelete(collection: SearchCollection): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    await removeSearchDocument(req.payload, collection, String(doc.id))
    return doc
  }
}
