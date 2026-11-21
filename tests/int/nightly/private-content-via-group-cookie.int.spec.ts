import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { requireMongoDB } from '../../helpers/mongodb'
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
 * Two independent defences, each asserted on its own (since e7652cc the first
 * one stops the attack before the second is reachable through REST):
 * 1. the save that ADDS another author's private content is refused (400);
 * 2. the read path stays closed even for a tour that already lists such
 *    content (a legacy tour saved before 1.), seeded below straight in the
 *    database, past every hook: `groupTourContentIds` only unlocks the
 *    private contents the tour's own author wrote.
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

/** Reads `contentId` with the group cookie of `tourId` and asserts it stays hidden. */
async function expectHiddenWithCookie(
  tourId: string,
  token: string,
  secret: { id: string; title: string },
) {
  const cookie = await groupCookieFor(tourId, token)
  const read = await call('GET', `/api/contents/${secret.id}?depth=0`, { token, cookie })
  expect(read.status).toBe(404)
  expect(JSON.stringify(read.json)).not.toContain(secret.title)
}

describe("another user's private content through one's own tour and a group room", () => {
  it('refuses the save of a private tour that includes it from the start', async () => {
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
    expect(tour.status).toBe(400)
    expect(JSON.stringify(tour.json)).not.toContain(secret.title)
  })

  it('refuses adding it to an existing tour', async () => {
    const [victim, attacker, { museum, object }] = await Promise.all([
      sandbox.user('victim'),
      sandbox.user('attacker'),
      sandbox.anchors(),
    ])
    const secret = await sandbox.content(victim, object, { priv: true })
    const open = await sandbox.content(attacker, object)
    const tour = await sandbox.tour(attacker, museum, [open.id, open.id], { visibility: 'private' })
    expect(tour.status).toBe(201)
    const patch = await call('PATCH', `/api/tours/${tour.json.doc.id}`, {
      token: attacker.token,
      body: { contents: [open.id, secret.id] },
    })
    expect(patch.status).toBe(400)
  })

  describe('a legacy tour that already lists it', () => {
    let payload: Payload
    beforeAll(async () => {
      await requireMongoDB()
      payload = await getPayload({ config: await config })
    })

    /** Saves the tour through REST, then appends `secretId` below the hooks, as an old save could have. */
    async function legacyTour(visibility: 'private' | 'public') {
      const [victim, attacker, { museum, object }] = await Promise.all([
        sandbox.user('victim'),
        sandbox.user('attacker'),
        sandbox.anchors(),
      ])
      const secret = await sandbox.content(victim, object, { priv: true })
      const open = await sandbox.content(attacker, object)
      const tour = await sandbox.tour(attacker, museum, [open.id, open.id], { visibility })
      expect(tour.status).toBe(201)
      const id = tour.json.doc.id as string
      await payload.db.updateOne({
        collection: 'tours',
        id,
        data: { contents: [open.id, secret.id] },
        returning: false,
      })
      return { attacker, secret, tourId: id }
    }

    it('does not unlock it for the room cookie of a private tour', async () => {
      const { attacker, secret, tourId } = await legacyTour('private')
      await expectHiddenWithCookie(tourId, attacker.token, secret)
    })

    it('does not unlock it for the room cookie of a public tour either', async () => {
      const { attacker, secret, tourId } = await legacyTour('public')
      await expectHiddenWithCookie(tourId, attacker.token, secret)
    })
  })
})
