import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-14, flow A1 (area A: roles / tenant / IDOR).
 *
 * The group cookie (`aa-group-tour`, src/lib/visibility.ts) unlocks every
 * content of the room's tour. A tour only refuses private stops when the tour
 * is public (`guardTourContents`, src/collections/Tours.ts): nothing checks
 * that a private stop belongs to the tour's author. So user X can put V's
 * private content (its id is public on `objects.contents`) in X's own private
 * tour, open a room for it, join, and read V's content with the cookie.
 *
 * Correct behaviour: the save is refused (or the private content stays
 * unreadable); a tour never lets its author unlock someone else's private
 * content.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

/** Opens a room for `tourId` as `token`, joins as its host and returns the group cookie. */
async function groupCookieFor(tourId: string, token: string) {
  const room = await call('POST', '/api/rooms', { token, body: { tourId, name: 'X' } })
  expect(room.status).toBe(200)
  const join = await call('POST', '/api/rooms/token', {
    headers: { 'X-Host-Key': room.json.hostKey, 'X-Guest-Id': 'nightly-guest-0001' },
    body: { room_name: room.json.code, participant_name: 'X' },
  })
  expect(join.status).toBe(200)
  const cookie = join.headers
    .getSetCookie()
    .map((line) => line.split(';')[0])
    .find((pair) => pair.startsWith('aa-group-tour='))
  expect(cookie).toBeTruthy()
  return cookie!
}

describe("another user's private content through one's own tour and a group room", () => {
  it('does not unlock it when the private tour includes it from the start', async () => {
    const [victim, attacker, { museum, object }] = await Promise.all([
      sandbox.user('victim'),
      sandbox.user('attacker'),
      sandbox.anchors(),
    ])
    const secret = await sandbox.content(victim, object, { priv: true })
    const open = await sandbox.content(attacker, object)
    const tour = await sandbox.tour(attacker, museum, [open.id, secret.id], {
      visibility: 'private',
    })
    // Either refusing the tour is correct; if it was saved the cookie must not help.
    if (tour.status === 201) {
      const cookie = await groupCookieFor(tour.json.doc.id, attacker.token)
      const read = await call('GET', `/api/contents/${secret.id}?depth=0`, {
        token: attacker.token,
        cookie,
      })
      expect(read.status).toBe(404)
      expect(JSON.stringify(read.json)).not.toContain(secret.title)
    } else {
      expect(tour.status).toBeGreaterThanOrEqual(400)
    }
  })

  it('does not unlock it when it is added to a tour that already has a cookie', async () => {
    const [victim, attacker, { museum, object }] = await Promise.all([
      sandbox.user('victim'),
      sandbox.user('attacker'),
      sandbox.anchors(),
    ])
    const secret = await sandbox.content(victim, object, { priv: true })
    const open = await sandbox.content(attacker, object)
    const tour = await sandbox.tour(attacker, museum, [open.id, open.id], { visibility: 'private' })
    expect(tour.status).toBe(201)
    const tourId = tour.json.doc.id as string
    const cookie = await groupCookieFor(tourId, attacker.token)

    // The tour is read live by `groupTourContentIds`: adding the stop afterwards.
    const patch = await call('PATCH', `/api/tours/${tourId}`, {
      token: attacker.token,
      body: { contents: [open.id, secret.id] },
    })
    if (patch.status === 200) {
      const read = await call('GET', `/api/contents/${secret.id}?depth=0`, {
        token: attacker.token,
        cookie,
      })
      expect(read.status).toBe(404)
      expect(JSON.stringify(read.json)).not.toContain(secret.title)
    } else {
      expect(patch.status).toBeGreaterThanOrEqual(400)
    }
  })
})
