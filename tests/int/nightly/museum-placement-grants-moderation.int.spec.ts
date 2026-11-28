import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A4): any signed-in user can obtain curator-level
 * powers over contents they have no relation to, by placing the target's
 * object on a museum they create themselves.
 *
 * "A content belongs to a museum" is derived from `museums.objects`, the index
 * `syncMuseumObjects` rebuilds from the placed `museum-objects` items of the
 * map (src/collections/Museums.ts) with NO check on who owns or already
 * exhibits the object, and `POST /api/museums` is open to everyone (the
 * creator becomes director). `museumIdsForContent` / `objectIdsInMuseums`
 * (src/access/museumRoles.ts) then feed:
 *  - `canReadPaidBody` (src/collections/Contents.ts): curator+ of a museum of
 *    the content read the paid `body` for free;
 *  - `deleteContents` (same file): staff delete the contents of their museum
 *    whose author is not staff, i.e. every other user's content about that
 *    object.
 * So: sign up, create a museum, PATCH its map with one item whose asset id is
 * the object of a paid content, and you can read that body without paying and
 * delete anyone's content about that object (docs/permissions-and-editing.md
 * says a curator moderates "non-staff contents" of HIS museum).
 *
 * Correct behaviour: placing an object on a map must not grant any power over
 * contents already written about it by others (the paid body stays locked,
 * the delete is refused with 403).
 */
const sandbox = new Sandbox()
const museums: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

const fresh = () => Math.random().toString(36).slice(2, 8)

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

describe('placing an object on your own museum map', () => {
  let attacker: Account
  let victim: Account
  let object: string

  beforeAll(async () => {
    ;[attacker, victim, { object }] = await Promise.all([
      sandbox.user('placer'),
      sandbox.user('author'),
      sandbox.anchors(),
    ])
    // The attacker's own museum (they become its director) places the object.
    const created = await call('POST', '/api/museums', {
      token: attacker.token,
      body: {
        name: `qa-${fresh()}`,
        shortDescription: 'qa',
        ticketInfo: { label: 'Tickets' },
        location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
      },
    })
    if (created.status !== 201) throw new Error(`museum create failed: ${created.status}`)
    museums.push(created.json.doc.id)
    const placed = await call('PATCH', `/api/museums/${created.json.doc.id}`, {
      token: attacker.token,
      body: { map: mapPlacing(object) },
    })
    if (placed.status !== 200) throw new Error(`map save failed: ${placed.status}`)
  })

  /** A victim's content about `object`; paid when `price` is set (by a super admin, as a verified seller would). */
  async function victimContent(price?: number) {
    const content = await sandbox.content(victim, object)
    if (price) {
      const token = await sandbox.admin()
      const set = await call('PATCH', `/api/contents/${content.id}`, { token, body: { price } })
      if (set.status !== 200) throw new Error(`price set failed: ${set.status}`)
    }
    return content
  }

  it('does not unlock the paid body of the contents of that object', async () => {
    const content = await victimContent(299)
    const read = await call('GET', `/api/contents/${content.id}?depth=0`, {
      token: attacker.token,
    })
    expect(read.status).toBe(200)
    expect(read.json.price).toBe(299)
    expect(read.json.body).toBeUndefined()
  })

  it('does not let the placer delete another user content about that object', async () => {
    const content = await victimContent()
    const del = await call('DELETE', `/api/contents/${content.id}`, { token: attacker.token })
    expect(del.status).toBe(403)
    const still = await call('GET', `/api/contents/${content.id}?depth=0`)
    expect(still.status).toBe(200)
  })
})
