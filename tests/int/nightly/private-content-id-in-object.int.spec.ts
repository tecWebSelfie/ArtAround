import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-19, flow D2 (area D: private exposure). Low severity.
 *
 * A PRIVATE content is hidden from every read (`readContents`), yet the work
 * it is about still lists it: `objects.contents` is a plain relationship array
 * and `GET /api/objects/<id>?depth=0` (also `?select[contents]=true&depth=0`)
 * returns the raw ids of ALL its contents, private ones included, to
 * anonymous visitors. It leaks the existence, the id (a Mongo ObjectId, so
 * also the creation time) and the number of an author's private contents; at
 * depth >= 1 the same ids are correctly dropped by the access rule.
 * Expected: depth 0 hides what depth 1 hides (e.g. an `afterRead` hook on
 * `objects.contents` that filters ids the viewer cannot read).
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

describe("a work's content list", () => {
  it('does not carry the id of a private content at depth 0', async () => {
    const author = await sandbox.user('qaauth')
    const { object } = await sandbox.anchors()
    const priv = await sandbox.content(author, object, { priv: true })

    const res = await call('GET', `/api/objects/${object}?depth=0`)
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.json.contents)).not.toContain(priv.id)
  })
})
