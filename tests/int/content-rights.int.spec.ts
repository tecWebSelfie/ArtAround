import { describe, expect, it } from 'vitest'
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import {
  creditLine,
  effectiveLicense,
  nonCommercialConflicts,
  PAID_LICENSE,
} from '@/lib/content-rights'

/**
 * Rights of a content (requirement 2 of `docs/plan/requisiti-18-33.md`): the
 * licence rules of `src/lib/content-rights.ts` and the `contents` and `tours`
 * hooks that enforce them on save, run against an in-memory request.
 */
const { Contents } = await import('@/collections/Contents')
const { Tour } = await import('@/collections/Tours')

type Doc = Record<string, unknown>

/** A request whose Local API answers memberships and contents from memory. */
function fakeRequest({
  user = { id: 'u1' },
  memberships = [],
  contents = [],
}: {
  user?: Doc | null
  memberships?: { museum: string; role: string }[]
  contents?: Doc[]
}) {
  return {
    user,
    context: {},
    payload: {
      find: async ({ collection }: { collection: string }) => ({
        docs: collection === 'user-museum-memberships' ? memberships : contents,
      }),
    },
  } as unknown as PayloadRequest
}

const hook = (hooks: CollectionBeforeChangeHook[] | undefined, name: string) => {
  const found = hooks?.find((fn) => fn.name === name)
  if (!found) throw new Error(`No beforeChange hook named ${name}`)
  return found
}
const guardRights = hook(Contents.hooks?.beforeChange, 'guardRights')
const guardNonCommercial = hook(Tour.hooks?.beforeChange, 'guardNonCommercialContents')

const run = (
  fn: CollectionBeforeChangeHook,
  data: Doc,
  req: PayloadRequest,
  operation: 'create' | 'update' = 'create',
  originalDoc?: Doc,
) => fn({ data, req, operation, originalDoc, context: {} } as never) as Promise<Doc>

describe('licence rules', () => {
  it('forces "all rights reserved" on paid contents and defaults to CC BY', () => {
    expect(effectiveLicense(500, 'cc-by-sa')).toBe(PAID_LICENSE)
    expect(effectiveLicense(0, 'cc-by-nc')).toBe('cc-by-nc')
    expect(effectiveLicense(null, null)).toBe('cc-by')
  })

  it('flags NC contents of other authors only in tours that sell contents', () => {
    const nc = { license: 'cc-by-nc' as const, author: 'other', price: 0 }
    const own = { license: 'cc-by-nc' as const, author: 'me', price: 0 }
    const paid = { license: PAID_LICENSE, author: 'me', price: 300 }
    expect(nonCommercialConflicts([nc, own], 'me')).toEqual([])
    expect(nonCommercialConflicts([nc, own, paid], 'me')).toEqual([nc])
  })

  it('builds the credit line from holder, year and licence', () => {
    expect(
      creditLine({ holder: 'Giulia Fontana', createdAt: '2026-11-04T10:00:00Z', license: 'cc0' }),
    ).toEqual({ copyright: '© Giulia Fontana 2026', license: 'cc0' })
  })
})

describe('contents: guardRights', () => {
  it('refuses a new content without the rights declaration, and stamps it when given', async () => {
    await expect(run(guardRights, { title: 'A' }, fakeRequest({}))).rejects.toThrow(/Declare/)
    const saved = await run(
      guardRights,
      { title: 'A', rightsDeclaredAt: '1999-01-01T00:00:00Z' },
      fakeRequest({}),
    )
    // The server's own time replaces whatever the client sent.
    expect(new Date(saved.rightsDeclaredAt as string).getFullYear()).toBeGreaterThan(2000)
  })

  it('lets only curators and directors name their museum as rights holder', async () => {
    const data = { rightsDeclaredAt: 'now', rightsMuseum: 'm1' }
    await expect(
      run(
        guardRights,
        { ...data },
        fakeRequest({ memberships: [{ museum: 'm1', role: 'verified' }] }),
      ),
    ).rejects.toThrow(/curators and directors/)
    await expect(
      run(
        guardRights,
        { ...data },
        fakeRequest({ memberships: [{ museum: 'm1', role: 'curator' }] }),
      ),
    ).resolves.toMatchObject({ rightsMuseum: 'm1' })
  })

  it('forces the paid licence, and trusts seeds and jobs without a user', async () => {
    const saved = await run(
      guardRights,
      { price: 300, license: 'cc-by' },
      fakeRequest({ user: null }),
    )
    expect(saved.license).toBe(PAID_LICENSE)
    // An edit that only changes the price still re-checks the stored licence.
    const edited = await run(guardRights, { price: 300 }, fakeRequest({}), 'update', {
      license: 'cc-by-sa',
      price: 0,
    })
    expect(edited.license).toBe(PAID_LICENSE)
  })
})

describe('tours: guardNonCommercialContents', () => {
  it('refuses a paid tour that includes another author’s NC content', async () => {
    const contents = [
      { id: 'c1', title: 'Shared', license: 'cc-by-nc', author: 'other', price: 0 },
      { id: 'c2', title: 'Sold', license: PAID_LICENSE, author: 'me', price: 300 },
    ]
    await expect(
      run(guardNonCommercial, { author: 'me', contents: ['c1', 'c2'] }, fakeRequest({ contents })),
    ).rejects.toThrow(/"Shared"/)
    await expect(
      run(
        guardNonCommercial,
        { author: 'me', contents: ['c1'] },
        fakeRequest({ contents: [contents[0]] }),
      ),
    ).resolves.toMatchObject({ contents: ['c1'] })
  })
})
