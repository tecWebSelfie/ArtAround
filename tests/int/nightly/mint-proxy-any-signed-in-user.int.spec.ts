import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 2: Mint proxy, src/endpoints/mint.ts).
 *
 * `/api/mint/v1/operations/:id`, `/models/:id` and `POST /reference-images`
 * only check `req.user`, and anybody can sign up. Whoever does can upload
 * images with the SERVER's paid Mint key (`mintServerClient`) and read any
 * operation or model of the account by id, with no tie to an object they own:
 * the generate-model endpoint deliberately lets only the object's owner steer
 * a generation with reference images (`canSteer`, objectModelGeneration.ts),
 * the browser client only uploads for those owners (ObjectModelGeneration.tsx)
 * and mint-browser-client.ts says the proxy "checks curator access", which it
 * does not. Also, a NUL in the id (`%00`) ends in a bare 500 with no body.
 *
 * The test never reaches Mint: the upload body is invalid on purpose, so the
 * only thing that can answer before validation is the access check.
 * Correct behaviour: a plain verified user is refused (401/403) before the
 * body is looked at (today: 400 from the validation of the body), and a
 * hostile id never gives a 500.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

let user: Account
beforeAll(async () => {
  user = await sandbox.user('mintuser')
})

describe('Mint proxy as a plain signed-in user', () => {
  it('does not offer the server upload to a user who owns no object', async () => {
    const res = await call('POST', '/api/mint/v1/reference-images', {
      token: user.token,
      body: {},
    })
    expect([401, 403]).toContain(res.status)
  })

  it('answers a NUL in the operation id with a 4xx, never a 500', async () => {
    const res = await call('GET', '/api/mint/v1/operations/%00', { token: user.token })
    expect(res.status).toBeLessThan(500)
  })
})
