import { afterAll, describe, expect, it } from 'vitest'
import { BASE, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-25, flow B1 (area B: tour navigation).
 *
 * The legacy redirect `/[lng]/tour/[id]/navigation[/...]`
 * (src/app/[lng]/(frontend)/tour/[id]/navigation/[[...rest]]/route.ts) reads
 * the tour with the Local API and no `overrideAccess: false`/user, so it
 * answers 308 with the tour's museum id for a PRIVATE tour of someone else,
 * where an unknown id gets 404 (and `/en/tour/<id>` itself answers 404).
 * Anybody can thus tell that a private tour exists and learn its museum.
 *
 * Correct behaviour: the same 404 as for an unknown id, no Location header,
 * for anonymous visitors and for signed-in users who are not the author.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const get = (path: string, token?: string) =>
  fetch(BASE + path, {
    headers: token ? { cookie: `payload-token=${token}` } : {},
    redirect: 'manual',
  })

describe('legacy tour navigation redirect of a private tour', () => {
  it('answers like an unknown tour to anonymous visitors and other users', async () => {
    const [owner, other, { museum, object }] = await Promise.all([
      sandbox.user('owner'),
      sandbox.user('other'),
      sandbox.anchors(),
    ])
    const stop = await sandbox.content(owner, object)
    const tour = await sandbox.tour(owner, museum, [stop.id, stop.id], { visibility: 'private' })
    expect(tour.status).toBe(201)
    const id = tour.json.doc.id as string

    // Control: an unknown id is a plain 404, and the tour page hides the private one.
    expect((await get('/en/tour/6af85f36157f25f9b01ffff0/navigation')).status).toBe(404)
    expect((await get(`/en/tour/${id}`)).status).toBe(404)

    for (const token of [undefined, other.token]) {
      const res = await get(`/en/tour/${id}/navigation`, token)
      expect(res.headers.get('location') ?? '').not.toContain(museum)
      expect(res.status).toBe(404)
    }
  })
})
