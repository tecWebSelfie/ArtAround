/**
 * Shared vocabulary of the Typesense search index.
 *
 * One collection (`TYPESENSE_COLLECTION`, default `artaround`) holds every searchable document, whatever its
 * source collection: the `kind` field tells the surfaces apart and the
 * per-surface `query_by` (src/lib/search/query.ts) decides which fields a
 * given search bar looks at, so the marketplace and the entity pages never
 * match on each other's data.
 */

/** Payload collections whose documents go into the index. */
export const SEARCH_COLLECTIONS = ['tours', 'contents', 'objects', 'museums', 'users'] as const

export type SearchCollection = (typeof SEARCH_COLLECTIONS)[number]

export type SearchDocKind = 'tour' | 'content' | 'object' | 'museum' | 'user'

export const SEARCH_KINDS: SearchDocKind[] = ['tour', 'content', 'object', 'museum', 'user']

export const SEARCH_KIND_BY_COLLECTION: Record<SearchCollection, SearchDocKind> = {
  tours: 'tour',
  contents: 'content',
  objects: 'object',
  museums: 'museum',
  users: 'user',
}

export const SEARCH_COLLECTION_BY_KIND: Record<SearchDocKind, SearchCollection> = {
  tour: 'tours',
  content: 'contents',
  object: 'objects',
  museum: 'museums',
  user: 'users',
}

/**
 * Cross-collection priority. Higher values come first before relevance is
 * considered: tours lead (starting a tour is the app's main way in), then
 * contents, museums, objects and people.
 */
export const SEARCH_PRIORITIES: Record<SearchCollection, number> = {
  tours: 10,
  contents: 8,
  museums: 6,
  objects: 5,
  users: 4,
}

/** One row of the search index, as stored in Typesense. */
export type SearchDocument = {
  /** `kind_sourceId`, stable across reindexes. */
  id: string
  source_id: string
  kind: SearchDocKind
  title: string
  excerpt?: string
  /** Public descriptions only: never a paid content body. */
  description?: string
  city?: string
  /** Museums the document belongs to (museum mode filtering). */
  museum_id?: string[]
  museum_name?: string
  /**
   * The scoped lists a "See all" link opens: `?author=` on tours and contents,
   * `?subject=` on works, contents and tours (`src/lib/search-scope.ts`). They
   * are indexed so a scoped page is the same ranked query with one more
   * `filter_by`, instead of a Payload id list the index would have to trust.
   */
  author_id?: string
  subject_ids?: string[]
  artist?: string
  difficulty?: string
  duration_seconds?: number
  price_cents?: number
  priority: number
  source_created_at?: number
}

/** A hit as returned by `searchItems()`, before Payload hydration. */
export type SearchHit = {
  /** Typesense document id (`kind_sourceId`). */
  searchId: string
  collection: SearchCollection
  sourceId: string
  kind: SearchDocKind
  title: string
  excerpt: string
  city: string
  priceCents: number
  sourceCreatedAt?: string
}
