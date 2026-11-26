import { afterAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-19 (areas D3/D4): wrong-typed JSON values reach the
 * database layer and answer a bare 500 "Something went wrong." instead of a
 * 400 validation error.
 *
 * - `price: "abc"` / `"NaN"` on a content PATCH (number field, no coercion
 *   check before the Mongo cast);
 * - `title: {a: 1}` on a content create (text field given an object);
 * - `body: {root: {children: "x"}}` (malformed Lexical state);
 * - `username: {a: 1}` on public sign-up.
 * Any signed-in (or anonymous, for sign-up) client can trigger them; the
 * server logs an unhandled error each time and monitoring sees noise.
 * Correct behaviour: 400 with a field validation message for each.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const fresh = () => Math.random().toString(36).slice(2, 9)

describe('wrong-typed values', () => {
  it('answer 4xx, never 500', async () => {
    const [account, { object }] = await Promise.all([sandbox.user('typed'), sandbox.anchors()])
    const own = await sandbox.content(account, object)
    const create = (extra: Record<string, unknown>) =>
      call('POST', '/api/contents', {
        token: account.token,
        body: {
          title: `qa-${fresh()}`,
          body: richText('x'),
          difficulty: 'easy',
          rightsDeclaredAt: new Date().toISOString(),
          attachToObject: object,
          ...extra,
        },
      })
    const statuses = {
      priceAbc: (
        await call('PATCH', `/api/contents/${own.id}`, {
          token: account.token,
          body: { price: 'abc' },
        })
      ).status,
      priceNaN: (
        await call('PATCH', `/api/contents/${own.id}`, {
          token: account.token,
          body: { price: 'NaN' },
        })
      ).status,
      titleObject: (await create({ title: { a: 1 } })).status,
      bodyChildren: (await create({ body: { root: { children: 'x' } } })).status,
      usernameObject: (
        await call('POST', '/api/users', {
          body: {
            email: `${fresh()}@qa.test`,
            password: 'Passw0rd!x',
            username: { a: 1 },
            name: { firstName: 'a', lastName: 'b' },
          },
        })
      ).status,
    }
    expect(statuses).toEqual({
      priceAbc: 400,
      priceNaN: 400,
      titleObject: 400,
      bodyChildren: 400,
      usernameObject: 400,
    })
  })
})
