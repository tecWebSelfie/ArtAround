import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-25, flow B8 (area B).
 *
 * POST /api/plan-tour (src/app/api/plan-tour/route.ts) reads the museum with
 * `findByID` inside the big try/catch, so a museum id that does not exist or is
 * malformed throws Payload's NotFound and is reported as
 * `502 {"error":"unavailable"}` (and logged as "Tour planning failed"): the
 * form shows "service unavailable" for a client error, and monitoring counts a
 * 5xx per request.
 *
 * Correct behaviour: a 4xx (e.g. 404/422 like the `museum` answer for an
 * unresolved museum), never 502.
 */
const answers = {
  minutes: 30,
  returning: false,
  adults: 2,
  childrenAges: [],
  interests: 'nightly qa unknown museum',
  lng: 'en',
}

describe('plan-tour with a museum that does not exist', () => {
  it.each(['6af85f36157f25f9b01ffff0', 'zzz'])(
    'museumId %s is a client error',
    async (museumId) => {
      const res = await fetch(`${BASE}/api/plan-tour`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Its own rate-limit bucket, so reruns and other specs don't interfere.
          'x-forwarded-for': `10.25.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
        },
        body: JSON.stringify({ ...answers, museumId }),
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    },
  )
})
