import type { Search } from '@/payload-types'
import type { Payload, TypedLocale, Where } from 'payload'
import {
  SEARCH_KIND_BY_COLLECTION,
  type SearchDocKind,
  type SearchPluginCollection,
} from './search-index'

export type SearchHit = {
  searchId: string
  collection: SearchPluginCollection
  sourceId: string
  kind: SearchDocKind
  title: string
  excerpt: string
  city: string
  priceCents: number
  sourceCreatedAt?: string
}

function idOf(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'id' in value) {
    return String((value as { id: string | number }).id)
  }
  return null
}

function isSearchPluginCollection(value: string): value is SearchPluginCollection {
  return Object.prototype.hasOwnProperty.call(SEARCH_KIND_BY_COLLECTION, value)
}

function mapSearchDoc(doc: Search): SearchHit | null {
  const relation = doc.doc as { relationTo?: string; value?: unknown } | undefined
  const sourceId = idOf(relation?.value)
  if (!relation?.relationTo || !sourceId || !isSearchPluginCollection(relation.relationTo)) {
    return null
  }

  return {
    searchId: String(doc.id),
    collection: relation.relationTo,
    sourceId,
    kind: (doc.kind as SearchDocKind | null) ?? SEARCH_KIND_BY_COLLECTION[relation.relationTo],
    title: doc.title ?? '',
    excerpt: doc.excerpt ?? '',
    city: doc.city ?? '',
    priceCents: doc.priceCents ?? 0,
    sourceCreatedAt: doc.sourceCreatedAt ?? undefined,
  }
}

/**
 * Single read path for the generated `search` collection.
 *
 * Both the marketplace and the navigator build their result set here; only the
 * `kinds`, price filter and sort differ. `query` is matched against the flattened
 * searchable text (title, excerpt) and museum city.
 */
export async function querySearchIndex({
  payload,
  query = '',
  kinds,
  price = 'all',
  page = 1,
  limit = 12,
  sort = '-sourceCreatedAt',
  locale,
  restrictTo,
}: {
  payload: Payload
  query?: string
  kinds: SearchDocKind[]
  price?: 'all' | 'free' | 'paid'
  page?: number
  limit?: number
  sort?: string | string[]
  locale?: TypedLocale
  /**
   * Museum mode: per kind, the only source ids allowed (e.g. the locked
   * museum, its tours and contents). Kinds missing here are not restricted.
   */
  restrictTo?: Partial<Record<SearchDocKind, string[]>>
}): Promise<{ hits: SearchHit[]; total: number }> {
  const conditions: Where[] = []

  if (kinds.length > 0) {
    const kindCondition = (kind: SearchDocKind): Where => {
      const ids = restrictTo?.[kind]
      return ids
        ? { and: [{ kind: { equals: kind } }, { 'doc.value': { in: ids } }] }
        : { kind: { equals: kind } }
    }
    conditions.push(restrictTo ? { or: kinds.map(kindCondition) } : { kind: { in: kinds } })
  }

  const trimmed = query.trim()
  if (trimmed) {
    conditions.push({
      or: [
        { title: { like: trimmed } },
        { excerpt: { like: trimmed } },
        { city: { like: trimmed } },
      ],
    })
  }

  if (price === 'free') {
    conditions.push({ priceCents: { equals: 0 } })
  } else if (price === 'paid') {
    conditions.push({ priceCents: { greater_than: 0 } })
  }

  const result = await payload.find({
    collection: 'search',
    where: conditions.length > 0 ? { and: conditions } : {},
    sort,
    page,
    limit,
    depth: 0,
    locale,
    // Search rows are public directory data; the source documents are hydrated
    // separately with the appropriate access rules.
    overrideAccess: true,
  })

  const hits = result.docs.map(mapSearchDoc).filter((hit): hit is SearchHit => hit !== null)

  return { hits, total: result.totalDocs }
}

/**
 * Home (navigator) search scope: what a visitor can go and see — tours (the
 * main way to use the app), contents and museums. Objects stay reachable from
 * QR codes and museum pages, people from the marketplace. City matching is
 * part of the query above, so a museum's city is searchable too.
 */
export const NAVIGATOR_SEARCH_KINDS: SearchDocKind[] = ['tour', 'content', 'museum']
