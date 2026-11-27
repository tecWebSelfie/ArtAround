import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-26, group tours (d): the `aa-group-tour` cookie that
 * `POST /api/rooms/token` hands to every joiner (host or guest) reads the
 * room's PRIVATE tour and its private contents for 4 hours. It names the room,
 * but nothing checks the room again: after the host ends the group
 * ("End the group tour", `DELETE /api/rooms/{code}`) every guest, including
 * anyone who only joined with a leaked code, keeps reading the private class
 * visit until the cookie expires.
 *
 * Expected behavior: ending the group ends the access it granted (the cookie's
 * room must still be open), or the docs must say the visit stays readable.
 * Judgement call: docs/group-tours.md only says "valid 4 hours".
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

describe('the group cookie of a private tour', () => {
  it('stops granting read once the host ended the group', async () => {
    const ip = { 'x-forwarded-for': `10.82.${Math.floor(Math.random() * 250)}.3` }
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
      headers: ip,
      body: { tourId, name: 'Author' },
    })
    expect(room.status).toBe(200)

    const join = await call('POST', '/api/rooms/token', {
      headers: { ...ip, 'X-Guest-Id': 'nightly-cookie-guest-01' },
      body: { room_name: room.json.code, participant_name: 'Guest' },
    })
    const cookie = join.headers
      .getSetCookie()
      .map((line) => line.split(';')[0])
      .find((pair) => pair.startsWith('aa-group-tour='))!
    expect((await call('GET', `/api/tours/${tourId}`, { cookie })).status).toBe(200)

    const ended = await call('DELETE', `/api/rooms/${room.json.code}`, {
      headers: { ...ip, 'X-Host-Key': room.json.hostKey },
    })
    expect(ended.status).toBe(204)
    expect((await call('GET', `/api/rooms/${room.json.code}`)).status).toBe(404)

    expect((await call('GET', `/api/tours/${tourId}`, { cookie })).status).toBe(404)
    expect((await call('GET', `/api/contents/${stop.id}`, { cookie })).status).not.toBe(200)
  })
})
