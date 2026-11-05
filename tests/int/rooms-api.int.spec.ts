import { beforeEach, describe, expect, it, vi } from 'vitest'

// The group room API (src/app/api/rooms): who gets a host token, who a guest
// token, and who may end a group. LiveKit itself is replaced by a fake room
// store; the routes' own checks are what is under test.
vi.mock('server-only', () => ({}))
const rooms = vi.hoisted(
  () => new Map<string, { tourId: string; hostName: string; showResults: boolean; key: string }>(),
)
vi.mock('@/lib/group-room', () => ({
  findGroupRoom: async (code: string) => rooms.get(code) ?? null,
  isHostKey: (room: { key: string }, request: Request) =>
    request.headers.get('X-Host-Key') === room.key,
  groupToken: async (_code: string, who: { identity: string; name: string }) => ({
    serverUrl: 'ws://livekit.test',
    token: `token-for:${who.identity}:${who.name}`,
  }),
  endGroupRoom: async (code: string) => void rooms.delete(code),
}))

const { POST: token } = await import('@/app/api/rooms/token/route')
const { DELETE: end, GET: info } = await import('@/app/api/rooms/[code]/route')

const tokenRequest = (body: unknown, headers: Record<string, string> = {}) =>
  token(
    new Request('http://test/api/rooms/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': crypto.randomUUID(),
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  )
const params = (code: string) => ({ params: Promise.resolve({ code }) })

describe('group room API', () => {
  beforeEach(() => {
    rooms.clear()
    rooms.set('AB3X9K', { tourId: 't1', hostName: 'Anna', showResults: true, key: 'secret-key' })
  })

  it('gives the host token only with the right host key', async () => {
    const body = { room_name: 'AB3X9K', participant_name: 'Anna' }
    const host = await tokenRequest(body, {
      'X-Guest-Id': 'device-123456',
      'X-Host-Key': 'secret-key',
    })
    expect(await host.json()).toEqual({
      server_url: 'ws://livekit.test',
      participant_token: 'token-for:host:Anna',
    })
    const impostor = await tokenRequest(body, {
      'X-Guest-Id': 'device-123456',
      'X-Host-Key': 'guess',
    })
    expect((await impostor.json()).participant_token).toBe('token-for:guest-device-123456:Anna')
  })

  it('rejects ended rooms, bad codes and missing device ids', async () => {
    const guest = { 'X-Guest-Id': 'device-123456' }
    expect((await tokenRequest({ room_name: 'ZZZZZZ', participant_name: 'M' }, guest)).status).toBe(
      404,
    )
    expect((await tokenRequest({ room_name: 'AB0X9K', participant_name: 'M' }, guest)).status).toBe(
      400,
    )
    expect((await tokenRequest({ room_name: 'AB3X9K', participant_name: '' }, guest)).status).toBe(
      400,
    )
    expect((await tokenRequest({ room_name: 'AB3X9K', participant_name: 'M' })).status).toBe(400)
  })

  it('tells the join page about the room, and only the host key ends it', async () => {
    expect(await (await info(new Request('http://test'), params('AB3X9K'))).json()).toEqual({
      tourId: 't1',
      hostName: 'Anna',
      showResults: true,
    })
    const wrong = await end(
      new Request('http://test', { method: 'DELETE', headers: { 'X-Host-Key': 'guess' } }),
      params('AB3X9K'),
    )
    expect(wrong.status).toBe(403)
    expect(rooms.has('AB3X9K')).toBe(true)
    const right = await end(
      new Request('http://test', { method: 'DELETE', headers: { 'X-Host-Key': 'secret-key' } }),
      params('AB3X9K'),
    )
    expect(right.status).toBe(204)
    expect((await info(new Request('http://test'), params('AB3X9K'))).status).toBe(404)
  })
})
