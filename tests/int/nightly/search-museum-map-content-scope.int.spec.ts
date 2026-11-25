import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24, flow search/stale rows (area E).
 *
 * A content's search row carries `museum_id`: the museums that exhibit the
 * object it describes (`museumsForContent`, src/lib/search/documents.ts), and
 * museum mode filters on it. When a museum's map changes, `refreshMuseumDependents`
 * (src/collections/Museums.ts) re-syncs the museum's TOURS and OBJECTS but not
 * the CONTENTS of the objects that were placed or removed. After the object is
 * taken off the map the content keeps the old `museum_id`, so the museum-mode
 * search of that museum (`aa-museum` cookie) still offers a content about a
 * work that is no longer on show there (and the museum it moved to never gets
 * it).
 *
 * Correct behaviour: after the object leaves the map, the content is no longer
 * found in that museum's mode.
 */
const sandbox = new Sandbox()
const MUSEUM_NAME = 'Museo Civico di Esempio' // seeded, three placed works
let restore: (() => Promise<unknown>) | null = null
afterAll(async () => {
  await restore?.()
  await sandbox.cleanup()
})

const inMuseumMode = async (museum: string, title: string, id: string) => {
  const res = await fetch(`${BASE}/api/navigator-search?q=${encodeURIComponent(title)}&limit=20`, {
    headers: { cookie: `aa-museum=${museum}` },
  })
  if (res.status !== 200) return null
  const body = (await res.json()) as { items: { href: string }[] }
  return body.items.some((item) => item.href.endsWith(`/content/${id}`))
}

describe('museum-mode search after an object leaves the museum map', () => {
  it('stops offering the contents of that object', async () => {
    const admin = await sandbox.admin()
    const list = await call('GET', '/api/museums?limit=50&depth=0')
    const museum = (list.json.docs as { id: string; name: string }[]).find(
      (entry) => entry.name === MUSEUM_NAME,
    )
    if (!museum) throw new Error('seeded museum not found')
    const stored = (await call('GET', `/api/museums/${museum.id}?depth=0`, { token: admin })).json
    const objectId = stored.objects[0] as string
    const nodes = stored.map.nodes as Record<string, { asset?: { id?: string }; parentId?: string }>
    const [nodeId, node] = Object.entries(nodes).find(([, n]) => n.asset?.id === objectId)!

    const author = await sandbox.user('author')
    const content = await sandbox.content(author, objectId)
    await new Promise((resolve) => setTimeout(resolve, 800))
    const before = await inMuseumMode(museum.id, content.title, content.id)
    if (before === null) return // search unavailable here
    expect(before).toBe(true)

    // The curator or director takes the work off the map.
    const without = { ...nodes }
    delete without[nodeId]
    const parent = without[node.parentId!] as { children?: string[] } | undefined
    if (parent?.children && node.parentId) {
      without[node.parentId] = {
        ...(without[node.parentId] as object),
        children: parent.children.filter((child) => child !== nodeId),
      } as (typeof without)[string]
    }
    restore = () =>
      call('PATCH', `/api/museums/${museum.id}`, { token: admin, body: { map: stored.map } })
    const patched = await call('PATCH', `/api/museums/${museum.id}`, {
      token: admin,
      body: { map: { ...stored.map, nodes: without } },
    })
    expect(patched.status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 1200))

    expect(await inMuseumMode(museum.id, content.title, content.id)).toBe(false)
  }, 60_000)
})
