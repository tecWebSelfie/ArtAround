import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-19 (area D3): any signed-in account can upload files of
 * any size to `contentImages` / `usersPropics`.
 *
 * Neither upload collection (src/collections/Contents.ts `ContentImages`,
 * src/collections/Users.ts `UsersPropics`) sets a size limit, and there is no
 * `upload.limits.fileSize` in src/payload.config.ts. A plain sign-up (public)
 * can POST a 150 MB "PNG" (a valid 1x1 PNG followed by padding) and get 201.
 * `contentImages` also can't be deleted by its uploader, so the file stays.
 * The deploy folder's disk quota is tiny (AGENTS.md → Deploy constraints):
 * a script fills it in a minute.
 *
 * Correct behaviour: an upload over a sane cap (e.g. 10 MB) is refused (413/400).
 * This spec uploads 25 MB.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const sandbox = new Sandbox()
const uploaded: string[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const id of uploaded) await call('DELETE', `/api/contentImages/${id}`, { token })
  await sandbox.cleanup()
})

describe('image upload size', () => {
  it('refuses a 25 MB picture', async () => {
    const account = await sandbox.user('uploader')
    const form = new FormData()
    form.append('_payload', JSON.stringify({ alt: 'qa-size' }))
    form.append(
      'file',
      new Blob([Buffer.concat([PNG, Buffer.alloc(25_000_000)])], { type: 'image/png' }),
      'qa-size.png',
    )
    const res = await fetch(BASE + '/api/contentImages', {
      method: 'POST',
      headers: { authorization: `JWT ${account.token}` },
      body: form,
    })
    const json = await res.json().catch(() => ({}))
    if (json?.doc?.id) uploaded.push(json.doc.id)
    expect(res.status).toBeGreaterThanOrEqual(400)
  }, 60_000)
})
