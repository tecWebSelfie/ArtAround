import { afterAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-19 (area D3): a plain user can write the `createdBy`
 * ownership field of their contents (create and PATCH).
 *
 * `createdBy` is added by the RBAC plugin (src/payload.config.ts, payloadPluginRBAC
 * targetCollections) without field access; `assignAuthor` only protects
 * `author` (src/collections/Contents.ts). `sanitizePublicSignup` strips
 * `createdBy` on user sign-up, but nothing does it for contents (nor tours,
 * objects, museums, quiz questions, which the same plugin covers and whose
 * access rules are built on `createdBy`, e.g. QuizQuestions.ts:32, Objects.ts:46).
 * So user A can create a content that records user B as its creator, or
 * re-assign it afterwards.
 *
 * Correct behaviour: the server always stamps `createdBy` with the caller;
 * a client-supplied value is ignored (or refused) for non-admins.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

describe('content createdBy', () => {
  it('cannot be set to another user on create', async () => {
    const [author, other, { object }] = await Promise.all([
      sandbox.user('framer'),
      sandbox.user('framed'),
      sandbox.anchors(),
    ])
    const res = await call('POST', '/api/contents', {
      token: author.token,
      body: {
        title: `qa-createdby-${Math.random().toString(36).slice(2, 8)}`,
        body: richText('x'),
        difficulty: 'easy',
        rightsDeclaredAt: new Date().toISOString(),
        attachToObject: object,
        createdBy: other.id,
      },
    })
    expect(res.status).toBe(201)
    sandbox.track('contents', res.json.doc.id)
    const created = res.json.doc.createdBy
    expect(typeof created === 'string' ? created : created?.id).toBe(author.id)
  })
})
