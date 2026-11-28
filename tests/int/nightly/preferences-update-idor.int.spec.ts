import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 4: Payload internal collections).
 *
 * Payload's `payload-preferences` collection restricts only `read` and
 * `delete` to the owner; `update` keeps the default (any signed-in user), so
 * `PATCH /api/payload-preferences/<id>` edits somebody else's preference by id
 * (the owner's `user` is even overwritten with the caller, which steals the
 * row), and the response echoes the victim's stored `value`.
 * Expected: the same 404/403 as `GET`/`DELETE` give for a row of another user,
 * the victim's value untouched.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

describe('updating the preference of another user by id', () => {
  it('is refused and leaves the row alone', async () => {
    const [victim, attacker] = await Promise.all([sandbox.user('prefvic'), sandbox.user('prefatk')])
    const key = `qa-pref-${Math.random().toString(36).slice(2, 8)}`
    const made = await call('POST', `/api/payload-preferences/${key}`, {
      token: victim.token,
      body: { value: { note: 'mine' } },
    })
    const id = made.json.doc.id as string

    const hit = await call('PATCH', `/api/payload-preferences/${id}`, {
      token: attacker.token,
      body: { value: { pwned: true } },
    })
    expect([403, 404]).toContain(hit.status)

    const mine = await call('GET', `/api/payload-preferences/${key}`, { token: victim.token })
    expect(mine.json.value).toEqual({ note: 'mine' })
    expect(mine.json.user.value).toBe(victim.id)
  })
})
