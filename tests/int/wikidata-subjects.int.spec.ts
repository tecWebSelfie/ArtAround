import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { claimIds, getWikidataEntities, searchWikidata } from '@/lib/wikidata'
import { importWikidataSubjects } from '@/tasks/importWikidataSubjects'

/**
 * Universal identifiers (requirement 5 of `docs/plan/requisiti-18-33.md`):
 * the Wikidata client and the import that links a work to its author,
 * movement and events, against recorded Wikidata answers (no network) and an
 * in-memory Local API.
 */

const label = (en: string, it: string) => ({
  labels: { en: { value: en }, it: { value: it } },
  descriptions: { en: { value: `${en} (description)` } },
})
const claim = (id: string) => [{ mainsnak: { datavalue: { value: { id } } }, rank: 'normal' }]

/** What `wbgetentities` returns for these ids; Q999 was merged into Q1103801. */
const ENTITIES: Record<string, object> = {
  Q1103801: {
    id: 'Q1103801',
    ...label('Ecstasy of Saint Cecilia', 'Estasi di santa Cecilia'),
    claims: { P170: claim('Q5597'), P135: claim('Q1474884') },
  },
  Q5597: { id: 'Q5597', ...label('Raphael', 'Raffaello Sanzio') },
  Q1474884: { id: 'Q1474884', ...label('High Renaissance', 'Alto Rinascimento') },
}

const fakeFetch = vi.fn(async (input: URL | RequestInfo) => {
  const url = new URL(String(input))
  if (url.searchParams.get('action') === 'wbsearchentities') {
    return Response.json({
      search: [{ id: 'Q1103801', label: 'Estasi di santa Cecilia', description: 'dipinto' }],
    })
  }
  const entities: Record<string, object> = {}
  for (const id of url.searchParams.get('ids')!.split('|')) {
    if (id === 'Q999')
      entities.Q1103801 = { ...ENTITIES.Q1103801, redirects: { from: 'Q999', to: 'Q1103801' } }
    else if (ENTITIES[id]) entities[id] = ENTITIES[id]
    else entities[id] = { id, missing: '' }
  }
  return Response.json({ entities })
}) as unknown as typeof fetch

/** Local API double: one work, the subjects created so far, recorded writes. */
function fakeRequest(work: { wikidataId?: string }) {
  const subjects: Record<string, unknown>[] = []
  const writes: {
    op: string
    collection: string
    data: Record<string, unknown>
    locale?: string
  }[] = []
  const req = {
    payload: {
      findByID: async () => ({ id: 'o1', ...work }),
      find: async ({ where }: { where: { wikidataId: { equals: string } } }) => ({
        docs: subjects.filter((s) => s.wikidataId === where.wikidataId.equals),
      }),
      create: async ({
        collection,
        data,
      }: {
        collection: string
        data: Record<string, unknown>
      }) => {
        const doc = { id: `s${subjects.length + 1}`, ...data }
        subjects.push(doc)
        writes.push({ op: 'create', collection, data })
        return doc
      },
      update: async (args: {
        collection: string
        data: Record<string, unknown>
        locale?: string
      }) => {
        writes.push({ op: 'update', ...args })
        return args.data
      },
    },
  } as unknown as PayloadRequest
  return { req, writes, subjects }
}

describe('Wikidata client', () => {
  it('searches items in the curator’s language', async () => {
    const results = await searchWikidata('Santa Cecilia', 'it', fakeFetch)
    expect(results).toEqual([
      { id: 'Q1103801', label: 'Estasi di santa Cecilia', description: 'dipinto' },
    ])
  })

  it('follows merged items to their current id', async () => {
    const entities = await getWikidataEntities(['Q999'], ['en'], fakeFetch)
    expect(entities.get('Q999')?.id).toBe('Q1103801')
    expect(claimIds(entities.get('Q999')!, 'P170')).toEqual(['Q5597'])
  })
})

describe('importWikidataSubjects', () => {
  it('creates the author and movement once, with names in every language, and links them', async () => {
    const { req, writes, subjects } = fakeRequest({ wikidataId: 'Q999' })
    const result = await importWikidataSubjects(req, 'o1', fakeFetch)
    expect(result).toEqual({ status: 'linked', subjects: 2 })
    expect(subjects.map((s) => [s.kind, s.name, s.wikidataId])).toEqual([
      ['person', 'Raphael', 'Q5597'],
      ['movement', 'High Renaissance', 'Q1474884'],
    ])
    // Italian names straight from Wikidata, no machine translation.
    expect(writes).toContainEqual(
      expect.objectContaining({
        collection: 'subjects',
        locale: 'it',
        data: expect.objectContaining({ name: 'Raffaello Sanzio' }),
      }),
    )
    // The work gets its links and the current id of the merged item.
    expect(writes.at(-1)).toMatchObject({
      collection: 'objects',
      data: { creators: ['s1'], movements: ['s2'], events: [], wikidataId: 'Q1103801' },
    })

    // A second import reuses the existing subjects.
    await importWikidataSubjects(req, 'o1', fakeFetch)
    expect(subjects).toHaveLength(2)
  })

  it('does nothing for a work without a Wikidata id', async () => {
    const { req, writes } = fakeRequest({})
    expect(await importWikidataSubjects(req, 'o1', fakeFetch)).toEqual({
      status: 'no-id',
      subjects: 0,
    })
    expect(writes).toEqual([])
  })
})
