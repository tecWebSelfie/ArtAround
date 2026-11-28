import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 3: "Plan my visit", PR #30-#32).
 *
 * `POST /api/plan-tour` reuses a tour planned before for the same answers
 * (`generation.requestKey`), but it looks that tour up BEFORE the model runs
 * and creates the new one after, with no lock or unique key in between. A
 * double submit (double click, Enter + click, a retry after a refresh while the
 * first request is still planning) therefore saves one tour per request: every
 * copy is a public tour of the museum, all with the same request key.
 *
 * Correct behaviour: one planned tour for one set of answers, however many
 * identical requests arrive together (they all answer with the same tour id).
 */
const sandbox = new Sandbox()
const tours = new Set<string>()
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of tours) await call('DELETE', `/api/tours/${id}`, { token })
  await sandbox.cleanup()
})

describe('identical plan-my-visit requests sent together', () => {
  it('end up on one planned tour', async () => {
    const { museum } = await sandbox.anchors()
    const body = {
      museumId: museum,
      minutes: 60,
      returning: false,
      adults: 2,
      childrenAges: [],
      interests: `nightly double submit ${Math.random().toString(36).slice(2, 8)}`,
      lng: 'en',
    }
    // Four callers behind four addresses: the per-IP limit (6/min) is not what is tested.
    const replies = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        call('POST', '/api/plan-tour', { body, headers: { 'x-forwarded-for': `10.77.0.${n}` } }),
      ),
    )
    for (const reply of replies) if (reply.json?.id) tours.add(String(reply.json.id))
    expect(replies.map((reply) => reply.status)).toEqual([200, 200, 200, 200])
    expect(new Set(replies.map((reply) => reply.json.id)).size).toBe(1)
  })
})
