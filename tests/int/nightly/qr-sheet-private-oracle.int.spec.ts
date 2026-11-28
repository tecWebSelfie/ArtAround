import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-27, flow 4 (QR sheet).
 *
 * `/api/qr-sheet` (src/app/api/qr-sheet/route.ts) resolves the museums of the
 * item with `itemMuseums` (src/lib/qr-museum.ts), which reads the tour or the
 * content with the Local API and NO `overrideAccess: false`/user. For
 * `format=svg|png` nothing else reads the document, so a director of any
 * museum that shows the item (anybody can create a museum and place any
 * object on its map) gets a 200 QR code for a PRIVATE content or tour of
 * another author, where an unknown id answers 403 and the item's own page
 * answers 404. The staff member can thus tell that a private content/tour id
 * exists and which of their museums shows it. (The PDF format reads the title
 * as the viewer and answers 404, so the formats disagree too.)
 *
 * Correct behaviour: the same answer as for an unknown id, whatever the format.
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
/** site > building > level > one placed catalog object. */
const scene = (objectId: string) => ({
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
})

const qr = (token: string, kind: string, id: string, format: string) =>
  fetch(`${BASE}/api/qr-sheet?kind=${kind}&id=${id}&format=${format}`, {
    headers: { authorization: `JWT ${token}` },
  }).then((res) => res.status)

describe('qr-sheet of a private content', () => {
  it('answers a museum director like an unknown id', async () => {
    const [director, owner, { object }] = await Promise.all([
      sandbox.user('director'),
      sandbox.user('owner'),
      sandbox.anchors(),
    ])
    const created = await call('POST', '/api/museums', {
      token: director.token,
      body: {
        name: `qa-${fresh()}`,
        shortDescription: 'qa',
        ticketInfo: { label: 'Tickets' },
        location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
      },
    })
    expect(created.status).toBe(201)
    museums.push(created.json.doc.id)
    const saved = await call('PATCH', `/api/museums/${created.json.doc.id}`, {
      token: director.token,
      body: { map: scene(object) },
    })
    expect(saved.status).toBe(200)

    const secret = await sandbox.content(owner, object, { priv: true })
    // Controls: the director's own museum shows a public content's code, an unknown id is refused.
    const open = await sandbox.content(owner, object)
    expect(await qr(director.token, 'content', open.id, 'svg')).toBe(200)
    const unknown = await qr(director.token, 'content', '6af85f36157f25f9b01ffff0', 'svg')

    for (const format of ['svg', 'png']) {
      expect({ format, status: await qr(director.token, 'content', secret.id, format) }).toEqual({
        format,
        status: unknown,
      })
    }
  })
})
