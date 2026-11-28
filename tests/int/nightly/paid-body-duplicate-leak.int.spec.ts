import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 7: `/duplicate`).
 *
 * The paid `body` of a content is hidden from everybody but its author,
 * buyers and staff (`canReadPaidBody`, src/collections/Contents.ts). Payload's
 * generic `POST /api/contents/:id/duplicate` copies the stored document with
 * the body, and the signed-in caller becomes the `author` of the copy, so
 * the copy is theirs to read: any signed-in user gets any paid body for free by
 * duplicating the content, both in the duplicate response and on a plain
 * read of the copy.
 * Expected: a caller who cannot read the paid body cannot get it through a
 * copy either (the duplicate is refused, or the copy carries no body).
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

let attacker: Account
let paidId: string

beforeAll(async () => {
  const [author, thief, { object }] = await Promise.all([
    sandbox.user('dupauthor'),
    sandbox.user('dupthief'),
    sandbox.anchors(),
  ])
  attacker = thief
  const content = await sandbox.content(author, object)
  paidId = content.id
  const admin = await sandbox.admin()
  // The price makes it paid (set by a super admin, as a seller would).
  const set = await call('PATCH', `/api/contents/${paidId}`, {
    token: admin,
    body: { price: 300 },
  })
  if (set.status !== 200) throw new Error(`price set failed: ${set.status}`)
})

describe('duplicating a paid content of somebody else', () => {
  it('does not hand over the locked body', async () => {
    const before = await call('GET', `/api/contents/${paidId}?depth=0`, { token: attacker.token })
    expect(before.json.body).toBeUndefined()

    const dup = await call('POST', `/api/contents/${paidId}/duplicate`, { token: attacker.token })
    const copyId = dup.json?.doc?.id as string | undefined
    if (copyId) sandbox.track('contents', copyId)

    expect(JSON.stringify(dup.json)).not.toContain('secret body')
    // A refused duplicate leaves nothing to read (unknown id answers 404, no body).
    const copy = await call('GET', `/api/contents/${copyId ?? paidId}?depth=0`, {
      token: attacker.token,
    })
    expect(copy.json.body).toBeUndefined()
  })
})
