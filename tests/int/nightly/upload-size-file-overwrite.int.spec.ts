import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-27, flow 5 (shared upload folder).
 *
 * The four picture collections share one `imageUpload` config and, once
 * sanitized, one folder (`museumThumbnails/`, see tests/int/uploads-dir.int.spec.ts).
 * Payload only picks a free name for the MAIN file (`reni.jpg` -> `reni-1.jpg`);
 * the resized copies are written as `<main>-<w>x<h>.<ext>` over whatever is
 * already on disk. So a signed-in user (any user may create a picture) who
 * uploads `holiday.jpg` sized so that its `card` copy is `holiday-480x343.jpg`
 * silently replaces the main file of another user's picture whose filename
 * already was `holiday-480x343.jpg` (a common export name, e.g. `photo-1024x768.jpg`),
 * in any of the four collections: the victim's content image now serves the
 * attacker's pixels, and deleting either record deletes the other's file.
 *
 * Correct behaviour: an upload never changes the bytes of an existing file.
 */
const sandbox = new Sandbox()
const uploads: { collection: string; id: string }[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const upload of uploads.reverse()) {
    await call('DELETE', `/api/${upload.collection}/${upload.id}`, { token })
  }
  await sandbox.cleanup()
})

const jpeg = (width: number, height: number, red: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: red, g: 0, b: 0 } } })
    .jpeg()
    .toBuffer()

async function upload(token: string, collection: string, filename: string, image: Buffer) {
  const form = new FormData()
  form.append('alt', 'qa')
  form.append('file', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), filename)
  const res = await fetch(`${BASE}/api/${collection}`, {
    method: 'POST',
    headers: { authorization: `JWT ${token}` },
    body: form,
  })
  const json = (await res.json()) as { doc?: { id: string; filename: string; url: string } }
  if (res.status !== 201 || !json.doc) throw new Error(`upload failed: ${res.status}`)
  uploads.push({ collection, id: json.doc.id })
  return json.doc
}

describe('picture uploads', () => {
  it("never overwrite another upload's file with a resized copy", async () => {
    const [victim, attacker] = await Promise.all([sandbox.user('victim'), sandbox.user('attacker')])
    const stem = `qa${Math.random().toString(36).slice(2, 8)}`
    // 700x500 -> card 480x343: the attacker's `<stem>.jpg` writes `<stem>-480x343.jpg`.
    const mine = await upload(
      victim.token,
      'contentImages',
      `${stem}-480x343.jpg`,
      await jpeg(700, 500, 0),
    )
    const read = async () => Buffer.from(await (await fetch(BASE + mine.url)).arrayBuffer())
    const before = await read()

    await upload(attacker.token, 'museumThumbnails', `${stem}.jpg`, await jpeg(700, 500, 255))
    const after = await read()
    expect(after.equals(before)).toBe(true)
  })
})
