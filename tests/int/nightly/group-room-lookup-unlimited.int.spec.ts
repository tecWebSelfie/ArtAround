import { describe, expect, it } from 'vitest'
import { call } from './helpers'

/**
 * Nightly QA 2026-11-26, group tours (d): `GET /api/rooms/{code}` (the join
 * page's "is this group open?") has no rate limit, while `POST /api/rooms` and
 * `POST /api/rooms/token` do (`allowRequest`). The code is the ONLY secret
 * that lets someone join a room (and receive the `aa-group-tour` cookie that
 * reads a private class tour), and the product encourages mnemonic names
 * ("Fenice rossa"), so an unlimited lookup that answers 200 with the tour id
 * and host name for an open code is a dictionary-attack oracle: ~230 guesses
 * per second from one IP were measured, each one a LiveKit `listRooms`.
 *
 * Expected secure behavior: the lookup is limited per IP like its siblings,
 * so a burst of guesses is answered 429 at some point.
 */
describe('GET /api/rooms/{code}', () => {
  it('is rate limited per client', async () => {
    const ip = { 'x-forwarded-for': `10.81.${Math.floor(Math.random() * 250)}.9` }
    const statuses: number[] = []
    for (let i = 0; i < 150; i++) {
      statuses.push((await call('GET', `/api/rooms/NOROOM${i}`, { headers: ip })).status)
    }
    expect(statuses).toContain(429)
  })
})
