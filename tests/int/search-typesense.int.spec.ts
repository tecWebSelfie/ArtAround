import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SearchDocument } from '@/lib/search/types'

/**
 * The search against a real Typesense node: the compose `typesense` of
 * `pnpm services:start` (TYPESENSE_* from .env / tests.yml, docs/search.md).
 * It checks what a mock cannot: the schema the app creates is accepted, and
 * the query `searchItems()` sends (infix fallback, typos, filters) runs on it.
 *
 * Each run writes to its own throwaway collection, never the app's: the
 * collection name is read when the client module loads, so it is set first.
 * Without a configured local node the spec fails instead of skipping: a
 * skipped search spec is not a pass (AGENTS.md); it refuses any other host.
 */
const collection = `artaround_spec_${process.pid}_${Date.now()}`
const appCollection = process.env.TYPESENSE_COLLECTION
process.env.TYPESENSE_COLLECTION = collection

const { isTypesenseConfigured, typesense } = await import('@/lib/search/client')
const { ensureSearchCollection, dropSearchCollection } = await import('@/lib/search/schema')
const { searchItems } = await import('@/lib/search/query')

const documents: SearchDocument[] = [
  {
    id: 'object_1',
    source_id: '1',
    kind: 'object',
    title: 'Ecstasy of Saint Teresa',
    artist: 'Gian Lorenzo Bernini',
    excerpt: 'Marble group by Bernini',
    priority: 2,
  },
  {
    id: 'tour_1',
    source_id: '2',
    kind: 'tour',
    title: 'Baroque Rome',
    excerpt: 'From Bernini to Borromini',
    price_cents: 500,
    priority: 3,
  },
  {
    id: 'content_1',
    source_id: '3',
    kind: 'content',
    title: 'Giotto signs his name',
    excerpt: 'A polyptych and its signature',
    priority: 1,
  },
]

beforeAll(async () => {
  if (!isTypesenseConfigured()) {
    throw new Error(
      'Typesense is not configured: run `pnpm services:start` and set TYPESENSE_* (.env.example).',
    )
  }
  // Collections are created and dropped with the admin key: only ever on
  // the local node, never on a Cloud cluster a developer's .env may name.
  if (!['127.0.0.1', 'localhost', '::1'].includes(process.env.TYPESENSE_HOST ?? '')) {
    throw new Error(
      `TYPESENSE_HOST is ${process.env.TYPESENSE_HOST}: this spec runs only on the local node (127.0.0.1).`,
    )
  }
  await ensureSearchCollection()
  await typesense()
    .collections<SearchDocument>(collection)
    .documents()
    .import(documents, { action: 'upsert' })
})

afterAll(async () => {
  if (isTypesenseConfigured()) await dropSearchCollection()
  // Back to the app's collection for whatever shares this process next.
  if (appCollection === undefined) delete process.env.TYPESENSE_COLLECTION
  else process.env.TYPESENSE_COLLECTION = appCollection
})

describe('search on the local Typesense node', () => {
  it('finds a work by its title', async () => {
    const { hits } = await searchItems({ q: 'saint teresa', kinds: [] })
    expect(hits.map((hit) => hit.searchId)).toContain('object_1')
  })

  it('tolerates a typo', async () => {
    const { hits } = await searchItems({ q: 'giotoo', kinds: [] })
    expect(hits.map((hit) => hit.searchId)).toContain('content_1')
  })

  it('narrows to the requested kinds and price', async () => {
    const tours = await searchItems({ q: 'bernini', kinds: ['tour'] })
    expect(tours.hits.map((hit) => hit.searchId)).toEqual(['tour_1'])
    const free = await searchItems({ q: 'bernini', kinds: [], price: 'free' })
    expect(free.hits.map((hit) => hit.searchId)).not.toContain('tour_1')
  })

  it('browses everything with an empty query', async () => {
    const { total } = await searchItems({ q: '', kinds: [] })
    expect(total).toBe(documents.length)
  })
})
