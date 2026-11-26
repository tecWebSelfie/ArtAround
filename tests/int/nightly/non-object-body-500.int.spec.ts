import { afterAll, describe, expect, it } from 'vitest'
import { BASE, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A7): a JSON body that is not an object answers a
 * bare 500 "Something went wrong." on every collection write, including the
 * anonymous public sign-up.
 *
 * `POST /api/users` with the body `null`, `"x"`, `1` or `true` throws inside
 * the RBAC plugin's field hooks, which read or assign `data.isSuperAdmin` /
 * `data.createdBy` on the raw body ("Cannot read properties of null (reading
 * 'isSuperAdmin')", "Cannot create property 'roles' on string 'x'") before
 * `sanitizePublicSignup` and the field validation can answer 400. The same
 * happens on contents, tours, museums and quiz questions (`createdBy`), and the
 * multipart `_payload` form of sign-up (`null`, `"x"`, malformed JSON, absent).
 * `sanitizePublicSignup` itself copes with null (`{ ...data }`). The custom
 * generate-model endpoint also 500s on malformed JSON
 * (`await req.json?.()` outside try/catch, src/endpoints/objectModelGeneration.ts).
 *
 * Correct behaviour: 400 for each (never 500, never a stored privileged field).
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const send = async (path: string, body: string, headers: Record<string, string> = {}) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
  await res.text()
  return res.status
}

describe('non-object request bodies', () => {
  it('public sign-up answers 4xx, never 500', async () => {
    const statuses: Record<string, number> = {}
    for (const body of ['null', '"x"', '1', 'true']) statuses[body] = await send('/api/users', body)
    expect(Math.max(...Object.values(statuses))).toBeLessThan(500)
  })

  it('multipart sign-up with an unusable _payload answers 4xx', async () => {
    const statuses: Record<string, number> = {}
    for (const payload of ['null', '"x"', '{bad']) {
      const form = new FormData()
      form.append('_payload', payload)
      const res = await fetch(`${BASE}/api/users`, { method: 'POST', body: form })
      await res.text()
      statuses[payload] = res.status
    }
    expect(Math.max(...Object.values(statuses))).toBeLessThan(500)
  })

  it('a signed-in content create and the generate-model endpoint answer 4xx', async () => {
    const [account, { object }] = await Promise.all([sandbox.user('nobody'), sandbox.anchors()])
    const auth = { authorization: `JWT ${account.token}` }
    const statuses = {
      contentNull: await send('/api/contents', 'null', auth),
      generateBadJson: await send(`/api/objects/${object}/generate-model`, '{"action":', auth),
    }
    expect(statuses.contentNull).toBe(400)
    expect(statuses.generateBadJson).toBe(400)
  })
})
