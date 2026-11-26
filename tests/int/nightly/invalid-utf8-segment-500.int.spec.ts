import { describe, expect, it } from 'vitest'
import { BASE } from './helpers'

/**
 * Nightly QA 2026-11-25, flow B1 (area B).
 *
 * A dynamic path segment holding invalid UTF-8 percent-encoding (`%ff`) makes
 * every id-based page answer 500 instead of 404: tour, museum, object,
 * content pages, the quiz, the museum navigation tree and the legacy tour
 * navigation redirect. Nothing is logged by the app (the failure is in the
 * framework's param decoding), so monitoring sees an anonymous 500 for any
 * mistyped or hostile link.
 *
 * Correct behaviour: a malformed id is a 404, like `zzz`.
 */
describe('malformed UTF-8 in an id segment', () => {
  it.each([
    '/en/tour/%ff',
    '/en/tour/%ff/quiz',
    '/en/tour/%ff/navigation',
    '/en/museum/%ff/navigation',
    '/en/object/%ff',
    '/en/content/%ff',
  ])('%s answers 404', async (path) => {
    const res = await fetch(BASE + path, { redirect: 'manual' })
    expect(res.status).toBe(404)
  })
})
