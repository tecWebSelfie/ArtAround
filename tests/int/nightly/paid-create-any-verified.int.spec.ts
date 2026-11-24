import { afterAll, describe, expect, it } from 'vitest'
import { call, richText, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A4): a verified creator of ANY museum can create
 * a paid content about an object that museum has nothing to do with.
 *
 * `guardPaidContent` (src/collections/Contents.ts) decides from the museums the
 * content belongs to: on update through `museumIdsForContent(originalDoc.id)`,
 * on create through `museumIdsForObjects([attachToObject])`. On create Payload
 * hands the hook an `originalDoc` that is not undefined (an empty object), so
 * the update branch runs with the id "undefined": the contains-query on
 * `objects.contents` matches every object, hence every museum that exhibits
 * anything, and the caller's verified badge in any of them satisfies the check
 * (a museum with an empty map does not: the bug needs one placed object). A user with no badge is
 * refused as documented, and the same price set by PATCH is refused too
 * (403), so only the create path is open.
 *
 * docs/permissions-and-editing.md: "Setting or changing a price requires
 * `verified`+ in a museum the content belongs to". Correct behaviour: 403 when
 * the object the content is attached to (or no object at all) is exhibited by
 * none of the caller's museums.
 */
const sandbox = new Sandbox()
const museums: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

/** A minimal Pascal scene: site > building > level > one placed catalog object. */
function mapPlacing(objectId: string) {
  const node = (type: string, id: string, parentId: string | null, children: string[]) => ({
    object: 'node',
    id,
    type,
    parentId,
    visible: true,
    metadata: {},
    children,
  })
  return {
    rootNodeIds: ['site_qa'],
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

describe('price on content create', () => {
  it('needs a badge in a museum the content belongs to, not in any museum', async () => {
    const [director, seller, { object }] = await Promise.all([
      sandbox.user('director'),
      sandbox.user('seller'),
      sandbox.anchors(),
    ])
    const created = await call('POST', '/api/museums', {
      token: director.token,
      body: {
        name: `qa-${Math.random().toString(36).slice(2, 8)}`,
        shortDescription: 'qa',
        ticketInfo: { label: 'Tickets' },
        location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
      },
    })
    if (created.status !== 201) throw new Error(`museum create failed: ${created.status}`)
    museums.push(created.json.doc.id)
    // The director's museum exhibits one object of its own (any exhibited object
    // is enough to trigger the bug), and `seller` is verified there.
    const own = await call('POST', '/api/objects', {
      token: director.token,
      body: { name: `qa-own-${Math.random().toString(36).slice(2, 8)}` },
    })
    if (own.status !== 201) throw new Error(`object create failed: ${own.status}`)
    const placed = await call('PATCH', `/api/museums/${created.json.doc.id}`, {
      token: director.token,
      body: { map: mapPlacing(own.json.doc.id) },
    })
    if (placed.status !== 200) throw new Error(`map save failed: ${placed.status}`)
    const grant = await call('POST', '/api/user-museum-memberships', {
      token: director.token,
      body: { user: seller.id, museum: created.json.doc.id, role: 'verified' },
    })
    if (grant.status !== 201) throw new Error(`verified grant failed: ${grant.status}`)

    const res = await call('POST', '/api/contents', {
      token: seller.token,
      body: {
        title: `qa-paid-${Math.random().toString(36).slice(2, 8)}`,
        body: richText('paid text'),
        difficulty: 'easy',
        rightsDeclaredAt: new Date().toISOString(),
        attachToObject: object,
        price: 199,
      },
    })
    if (res.status === 201) sandbox.track('contents', res.json.doc.id)
    expect(res.status).toBe(403)
  })
})
