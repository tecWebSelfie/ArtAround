import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 4: Payload internal collections).
 *
 * `payload-locked-documents` keeps Payload's default access (every signed-in
 * user may create, read, update and delete every lock). So any visitor can
 *   - POST a lock on a museum of somebody else: the director's next
 *     `PATCH /api/museums/:id` then answers 423 "locked by another user"
 *     (a cross-tenant denial of service that can be renewed forever);
 *   - list the locks of the staff (who is editing what).
 * Expected: a visitor can neither lock a document they cannot edit nor see
 * other users' locks; the director can still save their museum.
 */
const sandbox = new Sandbox()
const museums: string[] = []
const locks: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of locks) await call('DELETE', `/api/payload-locked-documents/${id}`, { token })
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

describe('a forged document lock', () => {
  it('does not stop the director from saving their museum', async () => {
    const [director, attacker] = await Promise.all([
      sandbox.user('lockdir'),
      sandbox.user('lockatk'),
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
    expect(created.status).toBe(201)
    const museum = created.json.doc.id as string
    museums.push(museum)

    const lock = await call('POST', '/api/payload-locked-documents', {
      token: attacker.token,
      body: {
        document: { relationTo: 'museums', value: museum },
        user: { relationTo: 'users', value: attacker.id },
      },
    })
    if (lock.status === 201) locks.push(lock.json.doc.id)

    const save = await call('PATCH', `/api/museums/${museum}`, {
      token: director.token,
      body: { shortDescription: 'still mine' },
    })
    expect(save.status).toBe(200)
  })

  it('is not listable by another user', async () => {
    const [owner, other] = await Promise.all([sandbox.user('locklist'), sandbox.user('lockpeek')])
    const lock = await call('POST', '/api/payload-locked-documents', {
      token: owner.token,
      body: {
        document: { relationTo: 'users', value: owner.id },
        user: { relationTo: 'users', value: owner.id },
      },
    })
    if (lock.status === 201) locks.push(lock.json.doc.id)
    const list = await call('GET', '/api/payload-locked-documents?depth=0&limit=100', {
      token: other.token,
    })
    expect(list.json.docs ?? []).toEqual([])
  })
})
