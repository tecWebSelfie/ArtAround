import { describe, expect, it } from 'vitest'
import { BASE, call } from './helpers'

/**
 * Nightly QA 2026-11-25, flow B1 (area B: tour navigation).
 *
 * The legacy redirect route
 * (src/app/[lng]/(frontend)/tour/[id]/navigation/[[...rest]]/route.ts) builds
 * `Location` as `/${lng}/museum/...` from the raw `[lng]` segment. The i18n
 * proxy matcher (src/proxy.ts) skips every path containing a dot, so
 * `/%2Fevil.com/tour/<id>/navigation` reaches the handler with
 * `lng = "/evil.com"` and the answer is `Location: //evil.com/museum/...`: a
 * protocol-relative URL, i.e. an open redirect from the app's own domain
 * (any tour id works, and ids are public). `%5C%5C` gives `/\\evil.com/...`,
 * which browsers read the same way.
 *
 * Correct behaviour: whatever the `lng`, the Location resolves to the app's
 * own origin (or the request is refused with a 4xx).
 */
describe('legacy tour navigation redirect with a hostile language segment', () => {
  it.each(['%2Fevil.com', '%2F%2Fevil.com', '%5C%5Cevil.com', '%5Cevil.com'])(
    'never leaves the app for lng=%s',
    async (lng) => {
      const tourId = (
        await call('GET', '/api/tours?limit=1&depth=0&where[visibility][not_equals]=private')
      ).json.docs[0].id as string
      const res = await fetch(`${BASE}/${lng}/tour/${tourId}/navigation`, { redirect: 'manual' })
      // A refusal has no Location: then it resolves to the app's own origin trivially.
      const location = res.headers.get('location') ?? '/'
      expect(new URL(location, BASE).origin).toBe(new URL(BASE).origin)
    },
  )
})
