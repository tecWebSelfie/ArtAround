import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-24, flow search/hostile params (area E).
 *
 * `/[lng]/search/contents?pick=tour&museum=<id>&returnTo=/en/tour/new` (the
 * tour editor's "Browse contents") calls `getTourEditorData(museum)`
 * (src/app/[lng]/(frontend)/tour/tour-editing.ts), whose
 * `payload.findByID('museums')` throws Payload's `NotFound` for an unknown or
 * malformed id. Next does not treat it as `notFound()`, so the page answers
 * 500 (error boundary, server error log), for anonymous visitors too. Same
 * class as `tour-page-not-found`.
 *
 * Correct behaviour: 404 (or the plain search), never 500.
 */
const picker = (museum: string) =>
  `${BASE}/en/search/contents?pick=tour&museum=${museum}&returnTo=${encodeURIComponent('/en/tour/new')}`

describe('contents picker for an unknown museum', () => {
  it('does not answer 500', async () => {
    for (const museum of ['000000000000000000000000', 'zzz']) {
      const res = await fetch(picker(museum))
      expect({ museum, status: res.status === 500 }).toEqual({ museum, status: false })
    }
  })
})
