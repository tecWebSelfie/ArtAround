import type { Payload, Where } from 'payload'
import { SEARCH_COLLECTION_NAME, typesense } from './client'
import {
  SEARCH_COLLECTION_BY_KIND,
  type SearchDocKind,
  type SearchDocument,
  type SearchHit,
} from './types'

/**
 * The single read path over the `search_items` collection.
 *
 * Each search bar (navigator, navigator in museum mode, marketplace,
 * `/search/{tours,objects,contents}`) passes the fields it looks at
 * (`queryBy`), its kinds and its own filters; the ranking stays one rule for
 * all: relevance, then the cross-collection priority, then recency.
 *
 * Typesense failures are thrown to the caller, which logs and falls back to a
 * degraded Payload query (`fallbackSearchItems`). Search is never the only way
 * to reach a document.
 */

export type SearchPrice = 'all' | 'free' | 'paid'

/** The navigator and marketplace look at the same three fields. */
export const DEFAULT_QUERY_BY = ['title', 'excerpt', 'city']
export const DEFAULT_QUERY_BY_WEIGHTS = '5,2,3'

export const DEFAULT_SORT_BY = '_text_match:desc,priority:desc,source_created_at:desc'
/** A wildcard query has no relevance: only priority and recency order it. */
const BROWSING_SORT_BY = 'priority:desc,source_created_at:desc'

export type SearchItemsOptions = {
  q?: string
  /** Empty means every kind (the marketplace "all" tab decides its own list). */
  kinds: SearchDocKind[]
  price?: SearchPrice
  page?: number
  limit?: number
  /** Museum mode: only documents belonging to this museum. */
  museumId?: string | null
  queryBy?: string[]
  queryByWeights?: string
  /** Extra raw `filter_by` conditions, ANDed with the ones above. */
  filterBy?: string[]
  sortBy?: string
}

function quote(value: string) {
  // Backticks are Typesense's escape for values with commas/spaces.
  return `\`${value.replaceAll('`', '')}\``
}

/** Builds the `filter_by` string from the structured options. */
export function buildFilterBy({
  kinds,
  price = 'all',
  museumId,
  filterBy = [],
}: Pick<SearchItemsOptions, 'kinds' | 'price' | 'museumId' | 'filterBy'>) {
  const conditions = [...filterBy]
  if (kinds.length > 0) conditions.push(`kind:=[${kinds.join(',')}]`)
  if (price === 'free') conditions.push('price_cents:=0')
  else if (price === 'paid') conditions.push('price_cents:>0')
  if (museumId) conditions.push(`museum_id:=${quote(museumId)}`)
  return conditions.join(' && ')
}

function toHit(document: SearchDocument): SearchHit {
  return {
    searchId: document.id,
    collection: SEARCH_COLLECTION_BY_KIND[document.kind],
    sourceId: document.source_id,
    kind: document.kind,
    title: document.title ?? '',
    excerpt: document.excerpt ?? '',
    city: document.city ?? '',
    priceCents: document.price_cents ?? 0,
    sourceCreatedAt: document.source_created_at
      ? new Date(document.source_created_at * 1000).toISOString()
      : undefined,
  }
}

export async function searchItems({
  q = '',
  kinds,
  price = 'all',
  page = 1,
  limit = 12,
  museumId,
  queryBy = DEFAULT_QUERY_BY,
  queryByWeights = DEFAULT_QUERY_BY_WEIGHTS,
  filterBy,
  sortBy,
}: SearchItemsOptions): Promise<{ hits: SearchHit[]; total: number }> {
  const trimmed = q.trim()
  const filter = buildFilterBy({ kinds, price, museumId, filterBy })

  const result = await typesense()
    .collections<SearchDocument>(SEARCH_COLLECTION_NAME)
    .documents()
    .search({
      q: trimmed || '*',
      query_by: queryBy.join(','),
      query_by_weights: queryByWeights,
      filter_by: filter || undefined,
      sort_by: sortBy ?? (trimmed ? DEFAULT_SORT_BY : BROWSING_SORT_BY),
      page,
      per_page: limit,
      prefix: true,
      infix: 'fallback',
      num_typos: 2,
      min_len_1typo: 4,
      min_len_2typo: 7,
    })

  return { hits: (result.hits ?? []).map((hit) => toHit(hit.document)), total: result.found }
}

/** Which collections a degraded read has to scan for these kinds. */
const COLLECTION_BY_KIND = SEARCH_COLLECTION_BY_KIND

/**
 * `searchItems` with the degraded Payload read as its fallback: the pages and
 * route handlers use this so a Typesense outage logs once and still answers.
 */
export async function searchItemsWithFallback({
  payload,
  ...options
}: SearchItemsOptions & { payload: Payload }) {
  try {
    return await searchItems(options)
  } catch (error) {
    console.error('[search] Typesense search failed, falling back', error)
    return fallbackSearchItems({
      payload,
      q: options.q,
      kinds: options.kinds,
      page: options.page,
      limit: options.limit,
      museumId: options.museumId,
    })
  }
}

/**
 * Degraded search: when Typesense is down, match the query with Payload's
 * `like` over the same public fields. It has no relevance ranking and no
 * typo tolerance, but it keeps the pages working (and logs why).
 * Callers use it only in a `catch`.
 */
export async function fallbackSearchItems({
  payload,
  q = '',
  kinds,
  page = 1,
  limit = 12,
  museumId,
}: {
  payload: Payload
  q?: string
  kinds: SearchDocKind[]
  page?: number
  limit?: number
  museumId?: string | null
}): Promise<{ hits: SearchHit[]; total: number }> {
  const trimmed = q.trim()
  if (!trimmed) return { hits: [], total: 0 }

  const hits: SearchHit[] = []
  for (const kind of kinds) {
    const collection = COLLECTION_BY_KIND[kind]
    const where: Where[] = [{ title: { like: trimmed } }]
    if (museumId && kind === 'tour') where.push({ museum: { equals: museumId } })
    const { docs } = await payload.find({
      collection,
      where: { and: where },
      depth: 0,
      locale: 'en',
      limit,
      overrideAccess: true,
    })
    for (const doc of docs) {
      const source = doc as unknown as { title?: string; name?: string; createdAt?: string }
      hits.push({
        searchId: `${kind}_${doc.id}`,
        collection,
        sourceId: String(doc.id),
        kind,
        title: source.title ?? source.name ?? '',
        excerpt: '',
        city: '',
        priceCents: 0,
        sourceCreatedAt: source.createdAt,
      })
    }
  }

  const start = (page - 1) * limit
  return { hits: hits.slice(start, start + limit), total: hits.length }
}
