import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-14, flow A4/A6 (area A): user emails are private.
 *
 * `hidePrivateFields` (src/collections/Users.ts) only deletes `email` from the
 * documents it returns, but `users.read` is open and Payload still lets the
 * `where` clause filter on `email`. Anyone, signed out, can therefore ask
 * "is there a user with this email" (`equals`) or extract an address one
 * prefix at a time (`like`), and learn which accounts the matching profile
 * belongs to.
 *
 * Correct behaviour: a query on `email` of someone else's account is refused
 * or matches nothing, whoever asks and whatever the operator.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const found = (res: Awaited<ReturnType<typeof call>>) =>
  res.status === 200 ? (res.json.totalDocs as number) : 0

describe("filtering users by another user's email", () => {
  it.each([
    ['anonymous', false],
    ['another user', true],
  ])('is not an oracle for %s', async (_who, signedIn) => {
    const [victim, other] = await Promise.all([sandbox.user('victim'), sandbox.user('other')])
    const token = signedIn ? other.token : undefined
    const encoded = encodeURIComponent(victim.email)
    const exact = await call('GET', `/api/users?depth=0&where[email][equals]=${encoded}`, { token })
    const prefix = await call(
      'GET',
      `/api/users?depth=0&where[email][like]=${encodeURIComponent(victim.email.slice(0, 9))}`,
      { token },
    )
    expect(found(exact)).toBe(0)
    expect(found(prefix)).toBe(0)
  })

  it('still lets users find themselves by email', async () => {
    const me = await sandbox.user('self')
    const res = await call(
      'GET',
      `/api/users?depth=0&where[email][equals]=${encodeURIComponent(me.email)}`,
      { token: me.token },
    )
    expect(found(res)).toBe(1)
  })
})
