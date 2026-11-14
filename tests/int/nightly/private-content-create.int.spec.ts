import { afterAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-14 (area A, found while building flow A1): a content can
 * be saved as private only by flipping a public one.
 *
 * `guardVisibility` (src/collections/Contents.ts) treats an update of a
 * public content as "becoming private" and refuses it when a purchase or
 * another author's/public tour uses the content. On create Payload hands the
 * hook an empty `originalDoc` (truthy), so a brand-new private content takes
 * that branch with its `id` undefined, and the tours count matches any tour of
 * another author: the create answers 400 "…it cannot become private".
 *
 * Correct behaviour: creating a private content with the content form's
 * `visibility: 'private'` succeeds (201) and stores it private.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

describe('creating a private content', () => {
  it('saves it private on the first POST', async () => {
    const [author, { object }] = await Promise.all([sandbox.user('author'), sandbox.anchors()])
    // At least one tour by someone else exists, as in any real database.
    const { museum } = await sandbox.anchors()
    const helper = await sandbox.user('helper')
    const stop = await sandbox.content(helper, object)
    await sandbox.tour(helper, museum, [stop.id, stop.id])

    const res = await call('POST', '/api/contents', {
      token: author.token,
      body: {
        title: `qa-private-${Math.random().toString(36).slice(2, 8)}`,
        body: richText('only for me'),
        difficulty: 'easy',
        visibility: 'private',
        rightsDeclaredAt: new Date().toISOString(),
        attachToObject: object,
      },
    })
    if (res.status === 201) sandbox.track('contents', res.json.doc.id)
    expect(res.status).toBe(201)
    expect(res.json.doc.visibility).toBe('private')
  })
})
