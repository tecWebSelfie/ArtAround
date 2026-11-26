import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-19, flow D1 (area D: paid content exposure).
 *
 * `canReadPaidBody` (src/collections/Contents.ts) decides from `doc.price`:
 * `if (!doc?.price) return true`. When a request narrows the fields with
 * `select`/`populate` and does not ask for `price`, Payload hands the field
 * access a doc WITHOUT `price`, so the body of a PAID content is judged free
 * and returned. Any anonymous visitor therefore reads it with
 *   GET /api/contents/<id>?select[body]=true
 *   GET /api/contents?where[id][equals]=<id>&select[body]=true
 *   GET /api/tours/<id>?populate[contents][body]=true   (and /api/objects/<id>)
 * The same flaw hits two server routes that select `body` alone while reading
 * as the visitor: `/api/content-audio/[id]` (step 1 says `ready` and streams
 * the read-aloud MP3 of a locked text; with a real speech key it would also
 * generate it) and `/api/expand` for `target: 'objects'` (populates
 * `contents: { title, body }` without `price`, so locked bodies feed the model
 * prompt and the saved, public variant).
 * Expected: a paid body that a visitor has not bought stays absent, whatever
 * `select`/`populate` they send (e.g. read `price` alongside, or check access
 * with the full document), and `/api/content-audio` answers `locked`.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

let author: Account
let visitor: Account
let paidId: string
let tourId: string
const marker = `PAIDMARK${Math.random().toString(36).slice(2, 9)}`

beforeAll(async () => {
  author = await sandbox.user('qaauth')
  visitor = await sandbox.user('qavis')
  const { museum, object } = await sandbox.anchors()
  const admin = await sandbox.admin()
  // Only a verified creator may set a price, so the super admin creates the
  // paid content on behalf of the author (`assignAuthor`).
  const paid = await call('POST', '/api/contents', {
    token: admin,
    body: {
      title: `qa-paid-${marker.toLowerCase()}`,
      body: richText(`locked text ${marker}`),
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
  // A tour needs at least two stops: the paid one and a free one.
  const free = await sandbox.content(author, object)
  const tour = await sandbox.tour(author, museum, [paidId, free.id])
  if (tour.status !== 201) throw new Error(`tour not created: ${tour.status}`)
  tourId = tour.json.doc.id
})

describe('a paid body stays hidden from a visitor who did not buy it', () => {
  it('sanity: plain reads hide the body', async () => {
    for (const token of [undefined, visitor.token]) {
      const res = await call('GET', `/api/contents/${paidId}`, { token })
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.json)).not.toContain(marker)
    }
  })

  it.each([
    ['select on the document', () => `/api/contents/${paidId}?select[body]=true`],
    ['select on a find', () => `/api/contents?where[id][equals]=${paidId}&select[body]=true`],
    ['populate of a tour stop', () => `/api/tours/${tourId}?depth=1&populate[contents][body]=true`],
  ])('%s', async (_name, path) => {
    for (const token of [undefined, visitor.token]) {
      const res = await call('GET', path(), { token })
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.json)).not.toContain(marker)
    }
  })

  it('/api/content-audio reports the audio as locked', async () => {
    for (const token of [undefined, visitor.token]) {
      const res = await call('GET', `/api/content-audio/${paidId}?locale=en&check=1`, { token })
      expect(res.json).toEqual({ status: 'locked' })
    }
  })
})
