import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-25, flow B1 (area B).
 *
 * `[lng]` is never validated: the i18n proxy only handles paths without a dot
 * (src/proxy.ts matcher `.*\..*` is excluded), and the root layout
 * (src/app/[lng]/layout.tsx) renders whatever segment it gets. A language
 * segment containing a dot or an encoded slash/backslash therefore reaches the
 * pages, and `LanguageSwitcher` calls `toLocaleUpperCase(lng)`, which throws
 * `RangeError: Incorrect locale information provided`: 500 (server error log
 * each time) instead of a 404.
 *
 * Correct behaviour: an unsupported language segment is a 404 (or a redirect
 * to a supported one), never a 5xx.
 */
describe('unsupported language segment', () => {
  it.each([
    '/e..n/navigator',
    '/%2Fevil.com/navigator',
    '/%5C%5Cevil.com/tour/6af85f36157f25f9b01ffff0',
    '/a.b/object/6af85f36157f25f9b01ffff0',
  ])('%s is not a server error', async (path) => {
    const res = await fetch(BASE + path, { redirect: 'manual' })
    expect(res.status).toBeLessThan(500)
  })
})
