import { SEARCH_COLLECTION_NAME, typesense } from './client'
import { ensureSearchCollection } from './schema'
import {
  SEARCH_COLLECTION_BY_KIND,
  type SearchDocKind,
  type SearchDocument,
  type SearchHit,
} from './types'

/**
 * The single read path over the search collection.
 *
 * Each search bar (navigator, navigator in museum mode, marketplace,
 * `/search/{tours,objects,contents}`) passes the fields it looks at
 * (`queryBy`), its kinds and its own filters; the ranking stays one rule for
 * all: relevance, then the cross-collection priority, then recency.
 *
 * There is deliberately no fallback to Payload: a Typesense failure is thrown
 * to the caller, so every surface shows its own error state. A second result
 * set with different ranking would hide an outage and could surface documents
 * the index already treats as unlisted.
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

/**
 * Typesense answers 400 to a request whose whole query string (`q` plus the
 * filter, query_by... parameters, all URL-encoded) exceeds 4000 characters, and
 * to a `page` that is not an unsigned integer. Those are request errors, not
 * outages, but every caller reports any Typesense failure as one, so the input
 * is normalized here, once, for all search surfaces.
 */
/** Well under 4000 even when every character is URL-encoded to 3 bytes (multi-byte text) and the filters add their share. */
const MAX_QUERY_LENGTH = 512
/** Far beyond any real pager, small enough to stay a safe integer offset. */
const MAX_PAGE = 10_000

export function normalizeSearchInput(q: string, page: number) {
  const safePage = Number.isFinite(page) ? Math.floor(page) : 1
  return {
    // Cut by code points: a UTF-16 slice could split a surrogate pair and leave a
    // lone surrogate, which makes URL encoding throw (reported as an outage).
    q: Array.from(q.trim()).slice(0, MAX_QUERY_LENGTH).join(''),
    page: Math.min(MAX_PAGE, Math.max(1, safePage)),
  }
}

function quote(value: string) {
  // Backticks are Typesense's escape for values with commas/spaces.
  return `\`${value.replaceAll('`', '')}\``
}

/**
 * One `filter_by` condition for "this field equals this value". The search
 * pages' URL scopes (`src/lib/search-scope.ts`) build their filters with it, so
 * quoting and escaping stay in one place.
 */
export function filterEquals(field: string, value: string) {
  return `${field}:=${quote(value)}`
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
  if (museumId) conditions.push(filterEquals('museum_id', museumId))
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
  // A fresh cluster has no collection yet. Creating it here (memoized) means
  // the first window after a deploy answers with an empty result instead of a
  // 404; the seed or a save then fills it.
  await ensureSearchCollection()

  const { q: trimmed, page: safePage } = normalizeSearchInput(q, page)
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
      page: safePage,
      per_page: limit,
      prefix: true,
      // Serves hits in the middle of a word ("ernini" → Bernini) when no
      // prefix match exists. The schema must declare `infix: true` on the same
      // fields (src/lib/search/schema.ts): without it Typesense answers 400.
      infix: 'fallback',
      num_typos: 2,
      min_len_1typo: 4,
      min_len_2typo: 7,
    })

  return { hits: (result.hits ?? []).map((hit) => toHit(hit.document)), total: result.found }
}
