import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24, flow search/stale rows (area E).
 *
 * `searchSyncAfterChange` (src/lib/search/sync.ts) runs in each save's
 * `afterChange` and upserts or deletes the row with no ordering between
 * saves. When an author's client sends several visibility PATCHes at once
 * (a double click, two tabs, a retry), the hooks finish in any order and the
 * LAST hook to finish wins, not the last save: the database ends `private`
 * while the index keeps the row (the private content stays in the search
 * results: `/api/navigator-search` hydrates with `overrideAccess: true`, and
 * the `/search/contents` cards render it for anonymous visitors), or ends
 * `public` with no row (a public content missing from every search).
 *
 * Correct behaviour: once the saves have settled, the content is listed in
 * search exactly when it is public.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const listed = async (title: string, id: string) => {
  const res = await fetch(`${BASE}/api/navigator-search?q=${encodeURIComponent(title)}&limit=20`)
  if (res.status !== 200) return null
  const body = (await res.json()) as { items: { href: string }[] }
  return body.items.some((item) => item.href.endsWith(`/content/${id}`))
}

describe('search index after concurrent visibility saves', () => {
  it('lists a content exactly when it is public once the saves settle', async () => {
    const [author, { object }] = await Promise.all([sandbox.user('author'), sandbox.anchors()])
    const probe = await sandbox.content(author, object)
    if ((await listed(probe.title, probe.id)) === null) return // search unavailable here
    await new Promise((resolve) => setTimeout(resolve, 500))

    const mismatches: string[] = []
    // The race is probabilistic (about one round in four on a warm server):
    // many rounds make a correct implementation pass and a racy one fail.
    for (let round = 0; round < 20; round++) {
      const content = await sandbox.content(author, object)
      await Promise.all(
        ['private', 'public', 'private', 'public', 'private', 'public'].map((visibility) =>
          call('PATCH', `/api/contents/${content.id}`, {
            token: author.token,
            body: { visibility },
          }),
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 700))
      const stored = (await call('GET', `/api/contents/${content.id}?depth=0`, {
        token: author.token,
      })) as { json: { visibility: string } }
      const isListed = await listed(content.title, content.id)
      if (isListed !== (stored.json.visibility === 'public')) {
        mismatches.push(`${content.id}: stored ${stored.json.visibility}, listed ${isListed}`)
      }
    }
    expect(mismatches).toEqual([])
  }, 120_000)
})
