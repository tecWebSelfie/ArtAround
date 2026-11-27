import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-18, flow C1 (area C: group rooms).
 *
 * A guest's LiveKit identity is `guest-<X-Guest-Id>` (src/app/api/rooms/token/route.ts)
 * and the id is the ONLY thing that proves "this is the same device" when a
 * guest reloads. But the identity is shown to every participant
 * (`useParticipants`, `RoomServiceClient.listParticipants`), so any guest can
 * read another guest's id, POST /api/rooms/token with `X-Guest-Id: <that id>`
 * and receive a token for the very same identity. Verified live with two real
 * browser connections: the second connection makes LiveKit disconnect the
 * victim (DUPLICATE_IDENTITY, reason 2) and the attacker then sets the
 * victim's `quizToken` / `quizDone` / `quizAnswered` attributes, which the
 * host's board and guest list show as the victim's.
 *
 * Expected secure behavior: the identity others can see must not be enough to
 * claim it (e.g. identity derived from a hash of the secret device id). This
 * spec asserts that at token level, so it needs no WebRTC: the `sub` of the
 * token minted for the victim, replayed as the guest id, must not produce the
 * same `sub`.
 */
const sandbox = new Sandbox()
const rooms: { code: string; hostKey: string }[] = []
afterAll(async () => {
  for (const room of rooms) {
    await call('DELETE', `/api/rooms/${room.code}`, { headers: { 'X-Host-Key': room.hostKey } })
  }
  await sandbox.cleanup()
})

const subOf = (jwt: string) =>
  JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub

describe('guest identity of a group room', () => {
  it('cannot be claimed by another device that has read it', async () => {
    const tour = (await call('GET', '/api/tours?limit=1&depth=0')).json.docs[0].id as string
    // A distinct forwarded IP keeps the route's rate limit out of the way.
    const ip = { 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.1` }
    const room = await call('POST', '/api/rooms', {
      headers: ip,
      body: { tourId: tour, name: 'H' },
    })
    expect(room.status).toBe(200)
    rooms.push(room.json)

    const join = (guestId: string, name: string) =>
      call('POST', '/api/rooms/token', {
        headers: { ...ip, 'X-Guest-Id': guestId },
        body: { room_name: room.json.code, participant_name: name },
      })
    const victim = await join('victim-device-secret-0001', 'Victim')
    expect(victim.status).toBe(200)
    // What every other participant can read about the victim.
    const visibleIdentity = subOf(victim.json.participant_token) as string

    // The attacker replays the visible identity as its own device id.
    const attacker = await join(visibleIdentity.replace(/^guest-/, ''), 'Attacker')
    expect(attacker.status).toBe(200)
    expect(subOf(attacker.json.participant_token)).not.toBe(visibleIdentity)
  })
})
