import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-27, flow 1 (search scopes).
 *
 * A user's search row carries `museum_id`: the museums of their tours and
 * contents (`buildSearchDocument`, case 'users', src/lib/search/documents.ts),
 * read with `overrideAccess: true` and with NO visibility filter, so a PRIVATE
 * content (or a private/personal tour) counts. The marketplace in museum mode
 * (cookie `aa-museum`, `/marketplace?kind=users`) filters users on that field,
 * so anybody can list "the people active in museum M" and a person whose only
 * work there is private shows up: private content existence and its museum
 * leak to anonymous visitors. (The same row is never refreshed when a content
 * is created, only on the next save of the user, so the scope is also stale in
 * the other direction.)
 *
 * Correct behaviour: only public contents/tours count for a user's museums, so
 * the museum-mode people search does not offer someone whose work there is private.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const page = (query: string, cookie?: string) =>
  fetch(`${BASE}/en/marketplace?kind=users&q=${encodeURIComponent(query)}`, {
    headers: cookie ? { cookie } : {},
  }).then((res) => res.text())

describe('people search in museum mode', () => {
  it('does not list a user whose only content in the museum is private', async () => {
    const [owner, { museum, object }] = await Promise.all([
      sandbox.user('hidden'),
      sandbox.anchors(),
    ])
    await sandbox.content(owner, object, { priv: true })
    // A profile save re-indexes the user (`searchSyncAfterChange('users')`).
    const save = await call('PATCH', `/api/users/${owner.id}`, {
      token: owner.token,
      body: { description: 'qa profile' },
    })
    expect(save.status).toBe(200)
    const username = owner.email.split('@')[0]

    // Control: the people search finds the user outside museum mode (their id is in a link).
    expect(await page(username)).toContain(owner.id)
    expect(await page(username, `aa-museum=${museum}`)).not.toContain(owner.id)
  })
})
