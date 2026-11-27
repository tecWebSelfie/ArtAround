import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-19 (area D6): the AI routes answer 500 to a malformed
 * body instead of 400.
 *
 * `/api/assistant` and `/api/transcribe` call `await request.formData()` outside
 * any try/catch (src/app/api/assistant/route.ts, src/app/api/transcribe/route.ts):
 * a request that is not multipart throws and Next answers an empty 500.
 * `/api/speech` does `const { text } = await request.json().catch(() => ({}))`:
 * the literal body `null` parses fine, so the destructuring throws a TypeError
 * (src/app/api/speech/route.ts). Any anonymous client can trigger these, and
 * every other AI route (`expand`, `plan-tour`) answers 400 "Invalid request".
 *
 * Correct behaviour: 400 { error: 'Invalid request' } for all three.
 */
// A fresh client IP per request keeps the per-IP rate limit (429) out of the way.
const fresh = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.7`

async function post(path: string, body: string, contentType: string) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': contentType, 'x-forwarded-for': fresh() },
    body,
  })
  await res.text()
  return res.status
}

describe('AI routes with a malformed body', () => {
  it('/api/assistant answers 4xx to a non-multipart body', async () => {
    expect(await post('/api/assistant', '{}', 'application/json')).toBe(400)
  })
  it('/api/transcribe answers 4xx to a non-multipart body', async () => {
    expect(await post('/api/transcribe', '{}', 'application/json')).toBe(400)
  })
  it('/api/speech answers 4xx to the JSON body null', async () => {
    expect(await post('/api/speech', 'null', 'application/json')).toBe(400)
  })
})
