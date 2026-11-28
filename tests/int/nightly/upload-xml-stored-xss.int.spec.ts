import { chromium } from 'playwright'
import { afterAll, describe, expect, it } from 'vitest'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-27 (area D, flow 1): stored XSS through uploads, and
 * full session hijacking through it.
 *
 * None of the upload collections that take arbitrary visitor files set
 * `mimeTypes` (`usersPropics` and `museumMaps` in src/collections/Users.ts
 * and src/collections/Museums.ts have `upload: true`; the `imageUpload`
 * collections in src/fields/imageUpload.ts, e.g. `contentImages`, set none
 * either). With no `mimeTypes`, Payload's `checkFileRestrictions`
 * (node_modules/payload/dist/uploads/checkFileRestrictions.js) only runs its
 * extension/MIME blocklist, which lists `htm`/`html`/`shtml`/`xhtml` but not
 * `xml`. A `.xml` file therefore uploads whatever its content, and `getFile`
 * (node_modules/payload/dist/uploads/endpoints/getFile.js) serves it as
 * `Content-Type: application/xml` with no CSP (the `script-src 'none'` CSP
 * only applies to `image/svg+xml`) and no `X-Content-Type-Options`.
 *
 * Chromium parses a well-formed XML document whose root element is in the
 * XHTML namespace (`xmlns="http://www.w3.org/1999/xhtml"`) as XHTML and DOES
 * execute its `<script>` — this is the well-known "XML + XHTML namespace"
 * stored-XSS vector, independent of the `<?xml ...?>` declaration. Any
 * signed-up visitor can plant such a file; any other signed-in visitor who
 * is lured into opening its URL (the file is served from the app's own
 * origin) runs the attacker's script with their own session: it can
 * `fetch('/api/users/me', {credentials:'include'})` using their httpOnly
 * `payload-token` cookie and read back their email (or do anything else
 * their session can).
 *
 * Correct behaviour: a `.xml` upload containing XHTML must never be served
 * in a way a browser executes as script, on any of the three collections
 * below. This spec plants the payload as a fresh visitor, "visits" it as a
 * second signed-in victim with a real Chromium page carrying that victim's
 * session cookie, and asserts the page's title was never rewritten with the
 * victim's own email — it currently is.
 */

const XHTML_SCRIPT_PAYLOAD = (marker: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>T</title></head><body><script>fetch('/api/users/me',{credentials:'include'}).then(r=>r.json()).then(j=>{document.title='${marker}:'+(j.user&amp;&amp;j.user.email)})</script></body></html>
`

/** Uploads `xml` as `filename` into `collection`, as `account`. */
async function uploadXml(
  collection: string,
  account: { token: string },
  filename: string,
  xml: string,
  extraFields?: Record<string, unknown>,
) {
  const form = new FormData()
  if (extraFields) form.append('_payload', JSON.stringify(extraFields))
  form.append('file', new Blob([xml], { type: 'application/xml' }), filename)
  const res = await fetch(BASE + '/api/' + collection, {
    method: 'POST',
    headers: { authorization: `JWT ${account.token}` },
    body: form,
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

/**
 * Opens `url` in a fresh Chromium page carrying `victimToken` as the
 * `payload-token` session cookie (the same JWT Payload's login issues both
 * as the response body's `token` and, verbatim, as the cookie value), and
 * returns the document's `<title>` text after the script would have had
 * time to run.
 */
async function titleAfterVisiting(victimToken: string, url: string) {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext()
    await context.addCookies([
      {
        name: 'payload-token',
        value: victimToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'load', timeout: 10_000 })
    await page.waitForTimeout(2_000)
    // `page.title()` (and Playwright's `title` locator, which waits for an
    // actionable element) are unreliable on a document served as
    // `application/xml`: it is not an HTML document, so `document.title`'s
    // own getter/setter behavior is unspecified here. The injected
    // `<title>` element's text content is mutated by the script regardless
    // (confirmed with `page.content()` while writing this spec), so read it
    // straight from the DOM — just as conclusive proof the script ran with
    // the victim's session, without depending on title-IDL semantics.
    // Awaited here, not returned directly: `finally` would otherwise close
    // the browser out from under this still-pending promise.
    return await page.evaluate(() => document.querySelector('title')?.textContent ?? null)
  } finally {
    await browser.close()
  }
}

const sandbox = new Sandbox()
// Uploaded docs aren't collections the Sandbox tracks (it only knows
// tours/contents/users): deleted here, as the seeded admin, like the sibling
// `upload-size-unlimited` spec does for `contentImages`.
const uploaded: { collection: string; id: string }[] = []
afterAll(async () => {
  const token = await sandbox.admin()
  for (const { collection, id } of uploaded)
    await call('DELETE', `/api/${collection}/${id}`, { token })
  await sandbox.cleanup()
})

describe('a .xml upload with an XHTML-namespace root', () => {
  it.each([
    ['usersPropics', { alt: 'qa' }],
    ['museumMaps', undefined],
    ['contentImages', { alt: 'qa' }],
  ] as const)('is not served in a way that runs script, on %s', async (collection, extraFields) => {
    const attacker = await sandbox.user('xssattacker')
    const victim = await sandbox.user('xssvictim')
    const marker = `ME-${collection}`
    const filename = `pwn-${collection}.xml`

    const upload = await uploadXml(
      collection,
      attacker,
      filename,
      XHTML_SCRIPT_PAYLOAD(marker),
      extraFields as Record<string, unknown> | undefined,
    )
    // Fixed behavior (N36): the collection's allow-list rejects a .xml upload
    // outright. If a collection ever accepts it again, the file it serves must
    // still never execute (checked below).
    if (upload.status >= 400 && upload.status < 500) return
    expect(upload.status).toBe(201)
    uploaded.push({ collection, id: upload.json.doc.id })

    const served = await fetch(`${BASE}/api/${collection}/file/${filename}`)
    expect(served.headers.get('x-content-type-options')).toBe('nosniff')

    const title = await titleAfterVisiting(
      victim.token,
      `${BASE}/api/${collection}/file/${filename}`,
    )

    // The bug: the script runs with the victim's session and rewrites the
    // title to "<marker>:<victim's own email>", proving it read
    // /api/users/me as the victim. Correct behaviour never lets that happen.
    expect(title).not.toBe(`${marker}:${victim.email}`)
  })
})
