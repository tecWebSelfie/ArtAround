import { afterAll, describe, expect, it } from 'vitest'
import { BASE, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-14, flow A7 (area A): pages of tours the visitor cannot
 * read.
 *
 * `/[lng]/tour/[id]` (src/app/[lng]/(frontend)/tour/[id]/page.tsx) reads the
 * tour with `payload.findByID` as the visitor. For a missing id, a malformed
 * id or someone else's private tour Payload throws its own `NotFound`, which
 * Next does not recognize as `notFound()`, so the route answers 500 (error
 * boundary, server error log) where the content and object pages answer 404.
 * No data leaks, but private-vs-missing is only a log line away and every such
 * link is an "error" for monitoring.
 *
 * Correct behaviour: 404 for all three, for anonymous and signed-in visitors.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const page = async (path: string, token?: string) =>
  (
    await fetch(BASE + path, {
      headers: token ? { cookie: `payload-token=${token}` } : {},
      redirect: 'manual',
    })
  ).status

describe('tour page for a tour the visitor cannot read', () => {
  it('answers 404 for a missing id and a malformed id', async () => {
    expect(await page('/en/tour/6af85f36157f25f9b01ffff0')).toBe(404)
    expect(await page('/en/tour/zzz')).toBe(404)
  })

  it("answers 404 for someone else's private tour, and 200 for its author", async () => {
    const [owner, other, { museum, object }] = await Promise.all([
      sandbox.user('owner'),
      sandbox.user('other'),
      sandbox.anchors(),
    ])
    const stop = await sandbox.content(owner, object)
    const tour = await sandbox.tour(owner, museum, [stop.id, stop.id], { visibility: 'private' })
    expect(tour.status).toBe(201)
    const path = `/en/tour/${tour.json.doc.id}`
    expect(await page(path, owner.token)).toBe(200)
    expect(await page(path, other.token)).toBe(404)
    expect(await page(path)).toBe(404)
  })
})
