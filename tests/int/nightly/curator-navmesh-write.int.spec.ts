import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-24 (area A6): a curator can overwrite a museum's
 * navigation meshes.
 *
 * `Museums.fields` wraps the metadata fields in `directorOnly`, but `navMesh`
 * and `navMeshWheelchair` (the walking meshes behind tour directions, derived
 * from the building structure the director draws) are declared outside that
 * list (src/collections/Museums.ts), so field access lets any curator write
 * them, and `guardCuratorMapEdits` only inspects `map`. A curator can thus
 * replace the mesh with another valid one (here the mesh of a different
 * museum) and break or misroute directions, which docs/permissions-and-editing.md
 * reserves to the director ("curators' map saves limited to object placement").
 *
 * Correct behaviour: a curator's `navMesh` / `navMeshWheelchair` are refused
 * (403) or dropped, like their other non-map fields.
 */
const sandbox = new Sandbox()
const museums: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

describe('curator navigation mesh', () => {
  it('is not writable by a curator', async () => {
    const [director, curator, list] = await Promise.all([
      sandbox.user('director'),
      sandbox.user('curator'),
      call('GET', '/api/museums?limit=50&depth=0'),
    ])
    // A valid mesh to send: borrowed from any seeded museum that has one.
    const donor = (list.json.docs as { navMesh?: unknown; navMeshWheelchair?: unknown }[]).find(
      (museum) => museum.navMesh && museum.navMeshWheelchair,
    )
    if (!donor) throw new Error('no seeded museum with a navigation mesh')
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
    const id = created.json.doc.id as string
    museums.push(id)
    const grant = await call('POST', '/api/user-museum-memberships', {
      token: director.token,
      body: { user: curator.id, museum: id, role: 'curator' },
    })
    if (grant.status !== 201) throw new Error(`curator grant failed: ${grant.status}`)

    await call('PATCH', `/api/museums/${id}`, {
      token: curator.token,
      body: { navMesh: donor.navMesh, navMeshWheelchair: donor.navMeshWheelchair },
    })
    const stored = (await call('GET', `/api/museums/${id}?depth=0`)).json
    expect({
      navMesh: Boolean(stored.navMesh),
      wheelchair: Boolean(stored.navMeshWheelchair),
    }).toEqual({
      navMesh: false,
      wheelchair: false,
    })
  })
})
