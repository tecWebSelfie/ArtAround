import { Errors } from 'typesense'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload'
import { isTypesenseConfigured, searchCollection } from './client'
import { buildSearchDocument, isUnlistedInSearch } from './documents'
import { ensureSearchCollection } from './schema'
import { SEARCH_KIND_BY_COLLECTION, type SearchCollection, type SearchDocument } from './types'

/**
 * Keeps Typesense in Cloud in step with Payload.
 *
 * Every hook is fail-soft: search is derived data, so a Typesense outage logs
 * and never rolls back a save. `pnpm search:reindex` repairs anything a failed
 * write missed. Without a configured cluster there is nothing to write to: the
 * hook warns once and leaves the save untouched (a local seed or an offline
 * environment still works).
 */

let warnedMissingConfig = false

function skipWithoutConfig(payload: Payload) {
  if (isTypesenseConfigured()) return false
  if (!warnedMissingConfig) {
    warnedMissingConfig = true
    payload.logger.warn(
      'Typesense is not configured (TYPESENSE_HOST / TYPESENSE_API_KEY): search documents are not indexed.',
    )
  }
  return true
}

function documentId(collection: SearchCollection, id: string) {
  return `${SEARCH_KIND_BY_COLLECTION[collection]}_${id}`
}

export async function removeSearchDocument(
  payload: Payload,
  collection: SearchCollection,
  id: string,
) {
  if (skipWithoutConfig(payload)) return
  try {
    // The collection is created on first use, so a delete against a fresh
    // cluster fails only when the row is genuinely gone.
    await ensureSearchCollection()
    await searchCollection().documents(documentId(collection, id)).delete()
  } catch (error) {
    // A document that was never indexed (private from the start, or a failed
    // earlier write) has nothing to remove.
    if (error instanceof Errors.ObjectNotFound) return
    payload.logger.error({
      err: error,
      msg: `Could not delete the search document for ${collection}:${id}`,
    })
  }
}

async function upsert(payload: Payload, document: SearchDocument) {
  if (skipWithoutConfig(payload)) return
  try {
    await ensureSearchCollection()
    await searchCollection().documents().upsert(document)
  } catch (error) {
    payload.logger.error({
      err: error,
      msg: `Could not index the search document ${document.id}`,
    })
  }
}

/**
 * Per-document serialization of index writes. Two saves of one document used
 * to upsert/delete from the doc each hook was handed, so whichever hook
 * finished last won even when its doc was not the latest committed state
 * (concurrent visibility PATCHes left a private content listed, or a public
 * one unlisted). Every write for a row now goes through this queue and decides
 * upsert vs delete from a FRESH read of the stored document, so the last
 * write in the queue always reflects the newest committed state. In-process
 * only: one Next server owns the index writes (a multi-instance deploy would
 * need a shared lock; `pnpm search:reindex` stays the repair).
 */
/**
 * Payload has no after-commit hook: `afterChange` runs inside the save's
 * transaction (when the database supports them), so a read made there cannot
 * see other saves' commits yet. `commitTransaction` deletes `req.transactionID`
 * once the save is final (committed or rolled back), so a queued run waits for
 * that before reading. Bounded, so a stuck request can't block the queue.
 */
/**
 * A real transaction is a string id. Without transaction support (standalone
 * MongoDB, the local and CI database) Payload leaves a resolved Promise on
 * `req.transactionID` forever, which must not count as "still in flight".
 */
const inTransaction = (req?: PayloadRequest) => typeof req?.transactionID === 'string'

async function waitForCommit(req?: PayloadRequest) {
  const deadline = Date.now() + 30_000
  while (inTransaction(req) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

type Slot = { tail: Promise<void>; waiting?: Set<PayloadRequest | undefined> }
const queues = new Map<string, Slot>()

/**
 * Runs `task` after the key's current run, coalescing: every call made while a
 * run is merely waiting joins it (a burst of N saves costs two syncs, not N,
 * and the run still reads the state after the last of them). All callers of
 * one key must pass the same task, since a joiner's own is not run. The run
 * waits for the commit of every request that joined it.
 */
function enqueue(key: string, req: PayloadRequest | undefined, task: () => Promise<void>) {
  const slot = queues.get(key) ?? { tail: Promise.resolve() }
  if (slot.waiting) {
    slot.waiting.add(req)
    return slot.tail
  }
  const waiting = new Set<PayloadRequest | undefined>([req])
  slot.waiting = waiting
  const run = slot.tail.then(async () => {
    // From here on new saves need a fresh run: this one has started reading.
    slot.waiting = undefined
    await Promise.all([...waiting].map(waitForCommit))
    await task()
  })
  slot.tail = run.catch(() => undefined)
  queues.set(key, slot)
  // Drop the entry once idle so the map does not grow with every document.
  const tail = slot.tail
  void tail.then(() => {
    if (queues.get(key) === slot && slot.tail === tail && !slot.waiting) queues.delete(key)
  })
  return run
}

/**
 * Indexes (or removes) one source document so the row matches the document as
 * it is stored once the write is committed. The document is always re-read
 * (see `queues`); the hook's own doc is never trusted.
 *
 * Inside a transaction the sync runs in the background after the commit (the
 * hook can't await its own commit); without one it completes before the save
 * returns, so a search right after the save already sees it.
 */
export async function syncSearchDocument({
  payload,
  collection,
  id,
  req,
}: {
  payload: Payload
  collection: SearchCollection
  id: string
  req?: PayloadRequest
}) {
  const task = enqueue(`${collection}:${id}`, req, async () => {
    let source: Record<string, unknown> | null = null
    try {
      // No `req`: a fresh read outside the saving request's transaction.
      source = (await payload.findByID({
        collection,
        id,
        depth: 0,
        locale: 'en',
        overrideAccess: true,
      })) as unknown as Record<string, unknown>
    } catch {
      // Gone (deleted, or the save rolled back before it existed): no row.
    }
    if (!source || isUnlistedInSearch(source)) {
      await removeSearchDocument(payload, collection, id)
      return
    }
    const document = await buildSearchDocument({ payload, collection, id, source })
    if (!document) {
      await removeSearchDocument(payload, collection, id)
      return
    }
    await upsert(payload, document)
  })
  if (inTransaction(req)) {
    // Never fail (or stall) the save over derived data.
    void task.catch((error: unknown) => {
      payload.logger.error({ err: error, msg: `Could not sync ${collection}:${id}` })
    })
    return
  }
  await task
}

/**
 * Refreshes a set of documents after a dependent change (a museum rename, a
 * content price, a tour's visitable stops changing).
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
      await syncSearchDocument({ payload, collection, id, req })
    } catch (error) {
      payload.logger.error({
        err: error,
        msg: `Could not refresh the search document for ${collection}:${id}`,
      })
    }
  }
}

/**
 * Refreshes the tours that include any of these contents (a content's price,
 * a work's name or artist: both are part of a tour's search text). The relation
 * lives on `tours.contents`, so the tours are read here before re-indexing.
 */
export async function resyncToursIncluding({
  payload,
  contentIds,
  req,
}: {
  payload: Payload
  contentIds: string[]
  req?: PayloadRequest
}) {
  const ids = [...new Set(contentIds.filter(Boolean))]
  if (!ids.length) return
  let tourIds: string[]
  try {
    const { docs } = await payload.find({
      collection: 'tours',
      where: { contents: { in: ids } },
      select: {},
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    tourIds = docs.map((tour) => String(tour.id))
  } catch (error) {
    // Search is derived data: never fail the save that triggered it.
    payload.logger.error({
      err: error,
      msg: `Could not read the tours including contents ${ids.join(', ')}`,
    })
    return
  }
  await resyncSearchDocuments({ payload, collection: 'tours', ids: tourIds, req })
}

/**
 * The `afterChange` / `afterDelete` pair every indexed collection installs:
 * one queued sync per save, nothing for the collection itself to
 * remember. The save never fails because of search (see `upsert`).
 */
export function searchSyncAfterChange(collection: SearchCollection): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    await syncSearchDocument({
      payload: req.payload,
      collection,
      id: String(doc.id),
      req,
    })
    return doc
  }
}

export function searchSyncAfterDelete(collection: SearchCollection): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    // Same queued sync as a save: it re-reads, finds nothing and removes the
    // row, and a late save sync can't resurrect it.
    await syncSearchDocument({ payload: req.payload, collection, id: String(doc.id), req })
    return doc
  }
}
