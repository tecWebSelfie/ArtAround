import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A2): `guardCuratorMapEdits` lets a curator change
 * parts of the museum scene that belong to the director.
 *
 * `curatorForbiddenChanges` (src/lib/pascal/map-permissions.ts) ignores every
 * node whose id is a `museum-objects` item in the STORED map or in the
 * incoming one (`objectNodes`, then `continue`), judging it only by the stored
 * side's shape. Nothing checks that the incoming node is still an item. So a
 * curator can overwrite an existing placed object, keeping its `item_*` id,
 * with a node of any other type (here a wall; a `museum:service` passes too)
 * and the save is accepted with 200, although structure and services are
 * "managed by the director" (docs/permissions-and-editing.md, Map ownership).
 *
 * It also only diffs `nodes` and `rootNodeIds`: the other top-level keys of the
 * scene (`installedPlugins`, `materials`, any extra key) are free for a curator.
 *
 * Correct behaviour: 403 listing the node (or the key) for both.
 */
const sandbox = new Sandbox()
const museums: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

const fresh = () => Math.random().toString(36).slice(2, 8)

const node = (type: string, id: string, parentId: string | null, children: string[]) => ({
  object: 'node',
  id,
  type,
  parentId,
  visible: true,
  metadata: {},
  children,
})

/** site > building > level > one placed catalog object (`item_qa`). */
function scene(objectId: string) {
  return {
    rootNodeIds: ['site_qa'],
    installedPlugins: ['artaround:museum-plugin'],
    nodes: {
      site_qa: node('site', 'site_qa', null, ['building_qa']),
      building_qa: node('building', 'building_qa', 'site_qa', ['level_qa']),
      level_qa: node('level', 'level_qa', 'building_qa', ['item_qa']),
      item_qa: {
        ...node('item', 'item_qa', 'level_qa', []),
        position: [1, 0, 1],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        asset: {
          id: objectId,
          category: 'museum-objects',
          name: 'Placed work',
          thumbnail: 'http://localhost:3000/models/default-standee.svg',
          source: 'library',
          src: 'http://localhost:3000/models/default-standee.glb',
          dimensions: [0.35, 1.094, 0.26],
          offset: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      },
    },
  }
}

/** A museum whose director saved a scene with one object; `curator` may edit its map. */
async function museumWithCurator(director: Account, curator: Account, object: string) {
  const created = await call('POST', '/api/museums', {
    token: director.token,
    body: {
      name: `qa-${fresh()}`,
      shortDescription: 'qa',
      ticketInfo: { label: 'Tickets' },
      location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
    },
  })
  if (created.status !== 201) throw new Error(`museum create failed: ${created.status}`)
  const id = created.json.doc.id as string
  museums.push(id)
  const saved = await call('PATCH', `/api/museums/${id}`, {
    token: director.token,
    body: { map: scene(object) },
  })
  if (saved.status !== 200) throw new Error(`map save failed: ${saved.status}`)
  const grant = await call('POST', '/api/user-museum-memberships', {
    token: director.token,
    body: { user: curator.id, museum: id, role: 'curator' },
  })
  if (grant.status !== 201) throw new Error(`curator grant failed: ${grant.status}`)
  return id
}

describe('curator map edits', () => {
  it('cannot turn a placed object into a wall', async () => {
    const [director, curator, { object }] = await Promise.all([
      sandbox.user('director'),
      sandbox.user('curator'),
      sandbox.anchors(),
    ])
    const id = await museumWithCurator(director, curator, object)
    const map = scene(object)
    // Same id (still `item_*`), but now a wall of the building structure.
    // oxlint-disable-next-line typescript/no-explicit-any -- hand-built scene
    ;(map.nodes as any).item_qa = {
      ...node('wall', 'item_qa', 'level_qa', []),
      start: [0, 0],
      end: [5, 0],
      thickness: 0.2,
      height: 2.5,
    }
    const res = await call('PATCH', `/api/museums/${id}`, { token: curator.token, body: { map } })
    const stored = await call('GET', `/api/museums/${id}?depth=0`)
    expect({ status: res.status, type: stored.json.map.nodes.item_qa.type }).toEqual({
      status: 403,
      type: 'item',
    })
  })

  it('cannot change the scene-level plugin list', async () => {
    const [director, curator, { object }] = await Promise.all([
      sandbox.user('director'),
      sandbox.user('curator'),
      sandbox.anchors(),
    ])
    const id = await museumWithCurator(director, curator, object)
    const map = { ...scene(object), installedPlugins: ['qa:evil-plugin'] }
    const res = await call('PATCH', `/api/museums/${id}`, { token: curator.token, body: { map } })
    const stored = await call('GET', `/api/museums/${id}?depth=0`)
    expect({ status: res.status, plugins: stored.json.map.installedPlugins }).toEqual({
      status: 403,
      plugins: ['artaround:museum-plugin'],
    })
  })
})
