import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-18, flow C4 (area C: group rooms / group cookie).
 *
 * The group cookie (`aa-group-tour`, 4 h) lets a guest read the room's PRIVATE
 * tour and its private contents. `POST /api/rooms` reads the tour "as the
 * viewer", and the viewer's tour read access includes the group cookie
 * (src/lib/visibility.ts), so an anonymous guest holding the cookie can open
 * THEIR OWN room for the author's private tour, get a host key, join it and
 * receive a fresh 4 h cookie, again and again after the real host ended the
 * group, and invite anyone with the new code.
 *
 * Expected secure behavior: only someone who may read the tour on their own
 * (author / editor) can open a room for it; the cookie alone must not.
 */
const sandbox = new Sandbox()
const rooms: { code: string; hostKey: string }[] = []
afterAll(async () => {
  for (const room of rooms) {
    await call('DELETE', `/api/rooms/${room.code}`, { headers: { 'X-Host-Key': room.hostKey } })
  }
  await sandbox.cleanup()
})

const ipHeader = () => ({ 'x-forwarded-for': `10.78.${Math.floor(Math.random() * 250)}.2` })

describe('opening a room with only the group cookie', () => {
  it('is refused for the private tour of someone else', async () => {
    const [author, { museum, object }] = await Promise.all([
      sandbox.user('author'),
      sandbox.anchors(),
    ])
    const stop = await sandbox.content(author, object, { priv: true })
    const tour = await sandbox.tour(author, museum, [stop.id, stop.id], { visibility: 'private' })
    expect(tour.status).toBe(201)
    const tourId = tour.json.doc.id as string

    const room = await call('POST', '/api/rooms', {
      token: author.token,
      headers: ipHeader(),
      body: { tourId, name: 'Author' },
    })
    expect(room.status).toBe(200)
    rooms.push(room.json)
    // An anonymous guest joins and receives the cookie.
    const join = await call('POST', '/api/rooms/token', {
      headers: { ...ipHeader(), 'X-Guest-Id': 'nightly-anon-guest-01' },
      body: { room_name: room.json.code, participant_name: 'Guest' },
    })
    const cookie = join.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .find((pair) => pair.startsWith('aa-group-tour='))!
    expect(cookie).toBeTruthy()
    expect((await call('GET', `/api/tours/${tourId}`, { cookie })).status).toBe(200)

    // The guest, still anonymous, opens a room of their own for the same tour.
    const own = await call('POST', '/api/rooms', {
      cookie,
      headers: ipHeader(),
      body: { tourId, name: 'Guest' },
    })
    if (own.status === 200) rooms.push(own.json)
    expect(own.status).not.toBe(200)
  })
})
