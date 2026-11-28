import { afterAll, describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 3: subjects).
 *
 * `subjects` (the global catalog of artists, styles, events, shared by every
 * museum) may be updated by `anyMuseumStaff`: staff of ANY museum. But
 * `POST /api/museums` is open to every signed-in user, who becomes its
 * director, so the "staff" gate is one request away: sign up, create a museum,
 * then rename a subject or change its Wikidata id for all museums
 * (docs/subjects-and-wikidata.md: "authors can't edit subjects themselves").
 * Expected: 403 for a user whose only museum is one they just created.
 */
const sandbox = new Sandbox()
const museums: string[] = []
let subject: string | undefined
afterAll(async () => {
  const token = await sandbox.admin()
  if (subject) await call('DELETE', `/api/subjects/${subject}`, { token })
  for (const id of museums) await call('DELETE', `/api/museums/${id}`, { token })
  await sandbox.cleanup()
})

describe('editing a global subject', () => {
  it('is refused to a user who is staff only of their own new museum', async () => {
    const [attacker, admin] = await Promise.all([sandbox.user('subjatk'), sandbox.admin()])
    const made = await call('POST', '/api/subjects', {
      token: admin,
      body: { kind: 'person', name: `qa-subject-${Math.random().toString(36).slice(2, 7)}` },
    })
    expect(made.status).toBe(201)
    subject = made.json.doc.id as string

    const museum = await call('POST', '/api/museums', {
      token: attacker.token,
      body: {
        name: `qa-${Math.random().toString(36).slice(2, 8)}`,
        shortDescription: 'qa',
        ticketInfo: { label: 'Tickets' },
        location: { address: 'Via QA 1', city: 'Bologna', latlng: [11.34, 44.49] },
      },
    })
    expect(museum.status).toBe(201)
    museums.push(museum.json.doc.id)

    const rename = await call('PATCH', `/api/subjects/${subject}`, {
      token: attacker.token,
      body: { name: 'defaced by a fresh sign-up' },
    })
    expect(rename.status).toBe(403)
  })
})
