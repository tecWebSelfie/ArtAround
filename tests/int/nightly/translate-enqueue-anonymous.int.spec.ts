import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 1: `/localized` and translation queue).
 *
 * `GET /api/{collection}/:id/localized` only enqueues a translation for a
 * document the caller can read, and throttles to 30 enqueues/min per IP. But
 * the plugin's own `POST /api/translate/enqueue` (mounted with the default,
 * open `access`: src/plugins/autoTranslate.ts, "Demo: public enqueue") does
 * none of that. An anonymous caller can queue a paid AI translation of ANY
 * document of the registered collections (a private content or tour of
 * somebody else, a document that does not even exist), into any language, with
 * no throttle at all. It also lets the caller read the job list of the
 * document (`GET /api/translate/document/:collection/:id`) and the collection.
 *
 * Correct behaviour: a document the caller cannot read is not queued (answer
 * 4xx or `queued: 0`), and the queue is rate limited like the `/localized`
 * route (here: 45 anonymous enqueues in a row hit a 429/4xx).
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

let privateId: string

beforeAll(async () => {
  const [owner, { object }] = await Promise.all([sandbox.user('enqowner'), sandbox.anchors()])
  const content: { id: string } = await sandbox.content(owner as Account, object, { priv: true })
  privateId = content.id
})

const enqueue = (id: string, locale = 'fr') =>
  call('POST', '/api/translate/enqueue', {
    body: {
      source_lng: 'en',
      target_lng: locale,
      collection_slug: 'contents',
      collection_id: [id],
      strategy: 'overwrite',
    },
  })

describe('anonymous POST /api/translate/enqueue', () => {
  it('does not queue the translation of a private content of somebody else', async () => {
    // The read route answers 404 for this visitor: the queue must not be a way around it.
    const read = await call('GET', `/api/contents/${privateId}/localized?locale=fr`)
    expect(read.status).toBe(404)

    const res = await enqueue(privateId)
    const queued = res.status < 300 && (res.json?.data?.queued ?? 0) > 0
    expect(queued).toBe(false)
  })

  it('is rate limited for an anonymous caller', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 45; i++) {
      // A document id that does not exist: still must not be an unlimited free queue.
      const res = await enqueue('0'.repeat(23) + (i % 10).toString(), 'de')
      statuses.push(res.status)
    }
    expect(statuses.some((status) => status >= 400)).toBe(true)
  })
})
