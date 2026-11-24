import type { Payload, TypedLocale } from 'payload'
import { asViewer } from '@/lib/session'
import type { SearchCollection, SearchHit } from './types'

/**
 * Reads the source documents of a page of search hits, in the hits' order.
 *
 * Typesense decides which documents match and their ranking; the page shows
 * real Payload documents (localized text, images) in exactly that order,
 * dropping any id that disappeared between the indexing and the read.
 *
 * The read runs as the visitor (`asViewer`: `user` + `overrideAccess: false`),
 * never with the Local API's default override: the index is derived data and
 * can briefly hold a stale row (a document made private, a save race), so
 * Payload's own read access, not the index, decides what a visitor sees. A
 * row the visitor can't read drops out like a deleted one.
 */
export async function docsInHitOrder<T>({
  payload,
  collection,
  hits,
  locale,
  depth = 1,
}: {
  payload: Payload
  collection: SearchCollection
  hits: SearchHit[]
  locale: TypedLocale
  depth?: number
}): Promise<T[]> {
  const ids = hits.filter((hit) => hit.collection === collection).map((hit) => hit.sourceId)
  if (ids.length === 0) return []

  const { docs } = await payload.find({
    collection,
    where: { id: { in: ids } },
    locale,
    depth,
    pagination: false,
    ...(await asViewer()),
  })
  const byId = new Map(docs.map((doc) => [String(doc.id), doc as unknown as T]))
  return ids.flatMap((id) => {
    const doc = byId.get(id)
    return doc ? [doc] : []
  })
}
