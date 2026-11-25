import { expect, test } from '@playwright/test'
import { requireTourFixture } from '../../helpers/tour-fixture'

/**
 * Nightly QA 2026-11-25 (B5): RemovedStopsModal remembers the last stop list
 * in sessionStorage, but its "first visit in this tab" effect
 * (`if (seen === null) store.save(key, current)`) runs with the hydration
 * render's value of `seen`, which is the store's server snapshot (`null`).
 * When hydration is slow (CPU-bound phone, cold cache) the effect overwrites
 * the remembered list with the NEW one before the modal can compare: the
 * removed stop is never announced and the cursor is not remapped, so the
 * visitor silently skips a stop.
 */
test.setTimeout(240_000)

const rt = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})

test('announces a removed stop even when the page hydrates slowly', async ({
  browser,
  request,
}) => {
  const fixture = requireTourFixture()
  const origin = new URL(fixture.url).origin
  const unique = `QA-REMOVED-${Date.now()}`

  // The author builds a private-to-the-test tour of three stops on the fixture museum's objects.
  const login = await request.post(`${origin}/api/users/login`, {
    data: { email: 'autore1@artaround.example', password: '12345678' },
  })
  const { token } = await login.json()
  const headers = { Authorization: `JWT ${token}` }
  const contents: string[] = []
  for (let i = 0; i < 3; i++) {
    const res = await request.post(`${origin}/api/contents`, {
      headers,
      data: {
        title: `${unique} stop ${i + 1}`,
        body: rt(`body ${i}`),
        difficulty: 'easy',
        rightsDeclaredAt: new Date().toISOString(),
        attachToObject: fixture.objectIds[i % fixture.objectIds.length],
      },
    })
    expect(res.ok()).toBeTruthy()
    contents.push((await res.json()).doc.id)
  }
  const tourRes = await request.post(`${origin}/api/tours`, {
    headers,
    data: { title: `${unique} tour`, museum: fixture.museumId, contents },
  })
  expect(tourRes.ok()).toBeTruthy()
  const tourId = (await tourRes.json()).doc.id as string

  const context = await browser.newContext()
  const page = await context.newPage()
  await page.request.post(`${origin}/api/users/login`, {
    data: { email: 'visitatore1@artaround.example', password: '12345678' },
  })
  const url = `${origin}/en/museum/${fixture.museumId}/navigation/tour/${tourId}/1`
  const key = `artaround:tour-stops:${tourId}`

  try {
    // The visitor is heading to stop 2; the tab remembers the three stops.
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect
      .poll(() => page.evaluate((k) => sessionStorage.getItem(k), key), { timeout: 60_000 })
      .toContain(contents[0])

    // The author deletes stop 1 (already completed) while the visit is under way.
    const del = await request.delete(`${origin}/api/contents/${contents[0]}`, { headers })
    expect(del.ok()).toBeTruthy()

    // A slow device: hydration of the reloaded page is CPU-bound.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog')).toContainText(`${unique} stop 1`, { timeout: 60_000 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  } finally {
    await context.close()
    for (const id of contents.slice(1))
      await request.delete(`${origin}/api/contents/${id}`, { headers })
    await request.delete(`${origin}/api/tours/${tourId}`, { headers })
  }
})
