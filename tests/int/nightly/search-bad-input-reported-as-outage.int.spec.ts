import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-24, flow search/hostile params (area E).
 *
 * Typesense rejects some visitor input with a 400 (`q` longer than 4000
 * characters, a `page` that is not an unsigned integer such as `1.5` or
 * `1e20`). `searchItems` (src/lib/search/query.ts) lets it through and every
 * caller treats ANY Typesense error as an outage: `/api/navigator-search`
 * answers 500 "Search is unavailable.", and `/search/{tours,contents,objects}`
 * and the marketplace render the "Search is not reachable right now" alert
 * (and log a server error). The cluster is fine; it is the request that is
 * out of range.
 *
 * Correct behaviour: out-of-range input is clamped or answered with an empty
 * result (200 / 4xx for the API), never reported as an outage.
 */
const alertShown = async (path: string) => {
  const res = await fetch(BASE + path)
  const html = await res.text()
  return { status: res.status, alert: html.includes('mantine-Alert-wrapper') }
}

describe('search with out-of-range input', () => {
  it('does not report a 5000-character query as an outage', async () => {
    const res = await fetch(`${BASE}/api/navigator-search?q=${'a'.repeat(5000)}`)
    expect(res.status).toBe(200)
    expect(await alertShown(`/en/search/contents?q=${'a'.repeat(5000)}`)).toEqual({
      status: 200,
      alert: false,
    })
  })

  it('does not report a fractional or huge page number as an outage', async () => {
    for (const page of ['1.5', '99999999999999999999']) {
      expect(await alertShown(`/en/search/contents?q=a&page=${page}`)).toEqual({
        status: 200,
        alert: false,
      })
      expect(await alertShown(`/en/marketplace?q=a&page=${page}`)).toEqual({
        status: 200,
        alert: false,
      })
    }
  })
})
