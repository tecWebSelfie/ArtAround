import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-19, flow D1 (area D: paid content exposure).
 *
 * The `body` of a paid content is hidden on read (`canReadPaidBody`,
 * src/collections/Contents.ts), but the field is still queryable: with no
 * document in hand the access function answers `true` (`!doc?.price`), so
 * Payload lets anybody filter on it. An anonymous visitor can run
 *   GET /api/contents?where[id][equals]=<paid>&where[body.root.children.children.text][like]=<word>
 * and read `totalDocs` 1 or 0: a boolean oracle that recovers a locked text
 * word by word (and, with `like` prefixes, letter by letter).
 * Expected: filtering on a paid body behaves as for any other unreadable
 * field (the query is refused, or never matches), so a matching and a
 * non-matching word answer the same.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

let paidId: string
const secretWord = `zebraquux${Math.random().toString(36).slice(2, 7)}`

beforeAll(async () => {
  const author = await sandbox.user('qaauth')
  const { object } = await sandbox.anchors()
  const admin = await sandbox.admin()
  const paid = await call('POST', '/api/contents', {
    token: admin,
    body: {
      title: `qa-paid-${Math.random().toString(36).slice(2, 9)}`,
      body: richText(`the locked text mentions ${secretWord}`),
      difficulty: 'easy',
      rightsDeclaredAt: new Date().toISOString(),
      attachToObject: object,
      price: 500,
      author: author.id,
    },
  })
  if (paid.status !== 201) throw new Error(`paid content not created: ${paid.status}`)
  paidId = paid.json.doc.id
  sandbox.track('contents', paidId)
})

const total = async (word: string) => {
  const qs = new URLSearchParams({
    'where[id][equals]': paidId,
    'where[body.root.children.children.text][like]': word,
    select: 'title',
  })
  const res = await call('GET', `/api/contents?${qs}`)
  return res.status === 200 ? (res.json.totalDocs as number) : res.status
}

describe('querying the body of a paid content', () => {
  it('does not tell an anonymous visitor which words it contains', async () => {
    const hit = await total(secretWord)
    const miss = await total('nomatchwordzz')
    expect(hit).toEqual(miss)
  })
})
