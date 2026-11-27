import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-19 (area D6): the AI routes' rate limit is bypassed by
 * sending a different `X-Forwarded-For` on every request.
 *
 * `allowRequest` (src/lib/rate-limit.ts) keys its window on the FIRST entry of
 * `x-forwarded-for`, which is the entry the client itself writes (a proxy
 * appends its own to the right). Rotating the header gives every request a
 * fresh budget, so the paid Groq/Fish routes (`/api/speech`: 40/min,
 * `/api/assistant`, `/api/expand`, `/api/plan-tour`, `/api/transcribe`) can be
 * called without limit by an anonymous client.
 *
 * Correct behaviour: the limit holds however the header is spoofed, e.g. key
 * on the LAST (proxy-appended) entry, or on the platform's trusted client IP.
 * Here 60 requests with 60 different spoofed IPs to a 40/min route must hit 429.
 */
describe('rate limit and X-Forwarded-For', () => {
  it('still answers 429 when every request claims another IP', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 60; i++) {
      const res = await fetch(BASE + '/api/speech', {
        method: 'POST',
        // Invalid body (empty text): rejected with 400 after the limiter, no model call.
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `172.31.${i}.${i + 1}` },
        body: JSON.stringify({ text: '' }),
      })
      await res.text()
      statuses.push(res.status)
    }
    expect(statuses).toContain(429)
  })
})
