import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

/**
 * Public and private contents and tours (requirement 8 of
 * `docs/plan/requisiti-18-33.md`): who may read a private document (author,
 * group guests with a valid cookie), the save rules, and the group cookie the
 * room token route sets. In-memory requests; LiveKit is a fake room store.
 */
vi.mock('server-only', () => ({}))
vi.mock('@/lib/group-room', () => ({
  findGroupRoom: async (code: string) =>
    code === 'AB3X9K'
      ? { tourId: 'tour-private', hostName: 'Anna', showResults: false, key: 'k' }
      : null,
  isHostKey: () => false,
  groupToken: async () => ({ serverUrl: 'ws://livekit.test', token: 'livekit-token' }),
  endGroupRoom: async () => undefined,
}))

vi.stubEnv('LIVEKIT_API_SECRET', 'test-livekit-secret')

/**
 * The cookies of the Next request being rendered: what a page's Local API
 * read (empty `req.headers`) falls back to. Empty outside a test that sets it.
 */
const pageCookies = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (pageCookies.has(name) ? { value: pageCookies.get(name) } : undefined),
  }),
}))

const {
  GROUP_TOUR_COOKIE,
  isPersonalTour,
  readContents,
  readTours,
  signGroupTourToken,
  verifyGroupTourToken,
} = await import('@/lib/visibility')
const { Contents } = await import('@/collections/Contents')
const { Tour } = await import('@/collections/Tours')
const { POST: joinRoom } = await import('@/app/api/rooms/token/route')

type Doc = Record<string, unknown>

/** A request with an optional user and cookie; `find`/`count`/`findByID` answer from memory. */
function fakeRequest({
  user = null,
  cookie = '',
  docs = [],
  counts = {},
}: {
  user?: Doc | null
  cookie?: string
  docs?: Doc[]
  counts?: Record<string, number>
}) {
  return {
    user,
    context: {},
    headers: new Headers(cookie ? { cookie } : {}),
    payload: {
      findByID: async () => ({ id: 'tour-private', contents: ['c-private', 'c-public'] }),
      find: async () => ({ docs }),
      count: async ({ collection }: { collection: string }) => ({
        totalDocs: counts[collection] ?? 0,
      }),
    },
  } as unknown as PayloadRequest
}

const hook = (hooks: CollectionBeforeChangeHook[] | undefined, name: string) => {
  const found = hooks?.find((fn) => fn.name === name)
  if (!found) throw new Error(`No beforeChange hook named ${name}`)
  return found
}
const run = (fn: CollectionBeforeChangeHook, data: Doc, req: PayloadRequest, originalDoc?: Doc) =>
  fn({ data, req, operation: originalDoc ? 'update' : 'create', originalDoc, context: {} } as never)

describe('group cookie token', () => {
  it('names the tour while valid, nothing when forged or expired', async () => {
    const token = await signGroupTourToken('tour-private', 'AB3X9K')
    expect(await verifyGroupTourToken(token)).toBe('tour-private')
    expect(await verifyGroupTourToken(`${token}x`)).toBeNull()
    expect(await verifyGroupTourToken(null)).toBeNull()
    vi.useFakeTimers({ now: Date.now() + 5 * 3600_000 })
    expect(await verifyGroupTourToken(token)).toBeNull()
    vi.useRealTimers()
  })

  it('is set when a guest joins a room, for the room’s tour', async () => {
    const response = await joinRoom(
      new Request('http://test/api/rooms/token', {
        method: 'POST',
        headers: { 'X-Guest-Id': 'device-123456', 'x-forwarded-for': crypto.randomUUID() },
        body: JSON.stringify({ room_name: 'AB3X9K', participant_name: 'Luca' }),
      }),
    )
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${GROUP_TOUR_COOKIE}=`)
    expect(cookie).toMatch(/HttpOnly/i)
    const token = decodeURIComponent(cookie.split(';')[0]!.split('=')[1]!)
    expect(await verifyGroupTourToken(token)).toBe('tour-private')
  })
})

describe('who reads private documents', () => {
  it('lets everyone read public ones, authors their own, guests their tour', async () => {
    expect(await readContents({ req: fakeRequest({}) } as never)).toEqual({
      or: [{ visibility: { not_equals: 'private' } }],
    })
    expect(await readTours({ req: fakeRequest({ user: { id: 'u1' } }) } as never)).toEqual({
      or: [{ visibility: { not_equals: 'private' } }, { author: { equals: 'u1' } }],
    })
    const token = await signGroupTourToken('tour-private', 'AB3X9K')
    const guest = fakeRequest({ cookie: `${GROUP_TOUR_COOKIE}=${encodeURIComponent(token!)}` })
    expect(await readTours({ req: guest } as never)).toMatchObject({
      or: expect.arrayContaining([{ id: { equals: 'tour-private' } }]),
    })
    expect(await readContents({ req: guest } as never)).toMatchObject({
      or: expect.arrayContaining([{ id: { in: ['c-private', 'c-public'] } }]),
    })
  })
})

describe('page reads of a group guest', () => {
  it('find the group cookie in the rendered request when the Local API has no headers', async () => {
    const token = await signGroupTourToken('tour-private', 'AB3X9K')
    pageCookies.set(GROUP_TOUR_COOKIE, token!)
    try {
      // A page's Local API read: no headers of its own.
      const req = Object.assign(fakeRequest({}), { payloadAPI: 'local' as const })
      expect(await readTours({ req } as never)).toMatchObject({
        or: expect.arrayContaining([{ id: { equals: 'tour-private' } }]),
      })
    } finally {
      pageCookies.clear()
    }
  })
})

describe('saving private documents', () => {
  const guardVisibility = hook(Contents.hooks?.beforeChange, 'guardVisibility')
  const guardPrivateContents = hook(Tour.hooks?.beforeChange, 'guardTourContents')

  beforeEach(() => vi.useRealTimers())

  it('never sells a private content, nor hides one people bought or use', async () => {
    await expect(
      run(guardVisibility, { visibility: 'private', price: 300 }, fakeRequest({})),
    ).rejects.toThrow(/cannot be sold/)
    const original = { id: 'c1', author: 'u1', visibility: 'public' }
    await expect(
      run(
        guardVisibility,
        { visibility: 'private' },
        fakeRequest({ counts: { purchases: 1 } }),
        original,
      ),
    ).rejects.toThrow(/cannot become private/)
    await expect(
      run(guardVisibility, { visibility: 'private' }, fakeRequest({}), original),
    ).resolves.toMatchObject({ visibility: 'private' })
  })

  it('counts the author’s own public tours among the ones a content can’t leave', async () => {
    let where: unknown
    const req = fakeRequest({})
    req.payload.count = (async (args: { collection: string; where: unknown }) => {
      if (args.collection === 'tours') where = args.where
      return { totalDocs: 0 }
    }) as never
    await run(guardVisibility, { visibility: 'private' }, req, {
      id: 'c1',
      author: 'u1',
      visibility: 'public',
    })
    expect(where).toEqual({
      and: [
        { contents: { contains: 'c1' } },
        { or: [{ author: { not_equals: 'u1' } }, { visibility: { not_equals: 'private' } }] },
      ],
    })
  })

  it('keeps private contents out of public tours', async () => {
    const req = fakeRequest({
      docs: [{ id: 'c-private', title: 'Notes for my class', visibility: 'private' }],
    })
    await expect(run(guardPrivateContents, { contents: ['c-private'] }, req)).rejects.toThrow(
      /"Notes for my class"/,
    )
    await expect(
      run(guardPrivateContents, { visibility: 'private', contents: ['c-private'] }, req),
    ).resolves.toMatchObject({ visibility: 'private' })
  })
})

/**
 * A visit copy ("Edit" on a tour's start page, `tours.visitCopyOf`) is one
 * visitor's own tour: always private, and out of every list like a planned
 * visit.
 */
describe('visit copies', () => {
  const keepVisitCopyPrivate = hook(Tour.hooks?.beforeChange, 'keepVisitCopyPrivate')

  it('stay private whatever the form sends, on create and on later saves', async () => {
    const req = fakeRequest({})
    expect(
      await run(keepVisitCopyPrivate, { visibility: 'public', visitCopyOf: 'tour-1' }, req),
    ).toMatchObject({ visibility: 'private' })
    expect(
      await run(keepVisitCopyPrivate, { visibility: 'public' }, req, { visitCopyOf: 'tour-1' }),
    ).toMatchObject({ visibility: 'private' })
    // Any other tour keeps the visibility it was given, and so does a copy
    // whose provenance is cleared in the same save.
    expect(await run(keepVisitCopyPrivate, { visibility: 'public' }, req)).toMatchObject({
      visibility: 'public',
    })
    expect(
      await run(keepVisitCopyPrivate, { visibility: 'public', visitCopyOf: null }, req, {
        visitCopyOf: 'tour-1',
      }),
    ).toMatchObject({ visibility: 'public' })
  })

  it('belong to whoever made them, a super admin too', async () => {
    const assignAuthor = hook(Tour.hooks?.beforeChange, 'assignAuthor')
    const admin = fakeRequest({ user: { id: 'admin-1', isSuperAdmin: true } })
    expect(await run(assignAuthor, { visitCopyOf: 'tour-1' }, admin)).toMatchObject({
      author: 'admin-1',
    })
    // Any other tour a super admin creates keeps the author they chose (or none).
    expect(await run(assignAuthor, { title: 'Seeded' }, admin)).not.toHaveProperty('author')
  })

  it('are left out of lists, like planned visits', () => {
    expect(isPersonalTour({ visitCopyOf: 'tour-1' })).toBe(true)
    expect(isPersonalTour({ generation: { generated: true } })).toBe(true)
    expect(isPersonalTour({ visitCopyOf: null, generation: { generated: false } })).toBe(false)
  })
})
