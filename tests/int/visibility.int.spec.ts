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

const { GROUP_TOUR_COOKIE, readContents, readTours, signGroupTourToken, verifyGroupTourToken } =
  await import('@/lib/visibility')
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
