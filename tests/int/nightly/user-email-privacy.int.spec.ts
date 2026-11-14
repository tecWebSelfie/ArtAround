import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Companion of `email-enumeration.int.spec.ts` (finding F2): the `email` and
 * `sessions` fields of `users` carry field-level read access
 * (`selfOrAdminField` in src/collections/Users.ts) and `confineEmailFilters`
 * keeps a visitor's own-email filter working. This spec pins what must stay
 * possible (own email, super admin, login, sign-up) next to what must not
 * (reading or filtering by someone else's email, on any path).
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const total = (res: Awaited<ReturnType<typeof call>>) =>
  res.status === 200 ? (res.json.totalDocs as number) : 0
const q = encodeURIComponent

describe('reading the email', () => {
  it('returns it to its owner only', async () => {
    const [me, other] = await Promise.all([sandbox.user('own'), sandbox.user('peek')])
    const mine = await call('GET', `/api/users/${me.id}?depth=0`, { token: me.token })
    expect(mine.json.email).toBe(me.email)
    const meRoute = await call('GET', '/api/users/me', { token: me.token })
    expect(meRoute.json.user.email).toBe(me.email)
    const theirs = await call('GET', `/api/users/${me.id}?depth=0`, { token: other.token })
    expect(theirs.json.email).toBeUndefined()
    const anon = await call('GET', `/api/users/${me.id}?depth=0`)
    expect(anon.json.email).toBeUndefined()
  })

  it('stays visible to a super admin, who can also filter by it', async () => {
    const victim = await sandbox.user('seen')
    const token = await sandbox.admin()
    const byId = await call('GET', `/api/users/${victim.id}?depth=0`, { token })
    expect(byId.json.email).toBe(victim.email)
    const exact = await call('GET', `/api/users?depth=0&where[email][equals]=${q(victim.email)}`, {
      token,
    })
    expect(total(exact)).toBe(1)
    const prefix = await call(
      'GET',
      `/api/users?depth=0&where[email][like]=${q(victim.email.slice(0, 9))}`,
      { token },
    )
    expect(total(prefix)).toBeGreaterThanOrEqual(1)
  })
})

describe('filtering by email', () => {
  it('only ever matches the visitor themselves', async () => {
    const [me, other] = await Promise.all([sandbox.user('conf'), sandbox.user('victimb')])
    // OR-ing another address into the filter must not widen it to their row.
    const either = await call(
      'GET',
      `/api/users?depth=0&where[or][0][email][equals]=${q(me.email)}&where[or][1][email][equals]=${q(other.email)}`,
      { token: me.token },
    )
    expect(either.json.docs.map((d: { id: string }) => d.id)).toEqual([me.id])
    // Negations and prefixes of the others' addresses reveal nothing either.
    const not = await call('GET', `/api/users?depth=0&where[email][not_equals]=${q(other.email)}`, {
      token: me.token,
    })
    expect(not.json.docs.map((d: { id: string }) => d.id)).toEqual([me.id])
  })

  it('keeps its own-email confinement next to a sibling `and` and for `like`', async () => {
    const [me, other] = await Promise.all([sandbox.user('sib'), sandbox.user('sibother')])
    const sibling = await call(
      'GET',
      `/api/users?depth=0&where[email][like]=${q(other.email)}&where[and][0][username][exists]=true`,
      { token: me.token },
    )
    expect(total(sibling)).toBe(0)
    const own = await call(
      'GET',
      `/api/users?depth=0&where[email][like]=${q(me.email.slice(0, 6))}`,
      {
        token: me.token,
      },
    )
    expect(own.json.docs.map((d: { id: string }) => d.id)).toEqual([me.id])
    const sorted = await call('GET', '/api/users?depth=0&limit=1&sort=email', { token: me.token })
    expect(sorted.status).toBe(400)
  })

  it('is refused through a relation path and for the session ids', async () => {
    const victim = await sandbox.user('rel')
    const token = (await sandbox.user('relasker')).token
    for (const t of [token, undefined]) {
      const tours = await call(
        'GET',
        `/api/tours?depth=0&where[author.email][equals]=${q(victim.email)}`,
        {
          token: t,
        },
      )
      expect(tours.status).toBe(400)
      const sessions = await call('GET', '/api/users?depth=0&where[sessions.id][exists]=true', {
        token: t,
      })
      expect(sessions.status).toBe(400)
    }
  })
})

describe('accounts keep working', () => {
  it('logs in by email or username and refuses a duplicate sign-up', async () => {
    const me = await sandbox.user('login')
    const username = me.email.split('@')[0]
    const byUsername = await call('POST', '/api/users/login', {
      body: { email: username, password: 'Passw0rd!x' },
    })
    expect(byUsername.status).toBe(200)
    // Payload lowercases and trims the address (the base field's hook survives).
    const shouting = await call('POST', '/api/users/login', {
      body: { email: me.email.toUpperCase(), password: 'Passw0rd!x' },
    })
    expect(shouting.status).toBe(200)
    const dup = await call('POST', '/api/users', {
      body: {
        email: me.email,
        password: 'Passw0rd!x',
        username: `${username}2`,
        name: { firstName: 'Q', lastName: 'dup' },
      },
    })
    expect(dup.status).toBe(400)
  })
})
