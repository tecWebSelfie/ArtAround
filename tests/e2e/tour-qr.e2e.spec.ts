import { expect as baseExpect, test, type Page } from '@playwright/test'
import { toDataURL } from 'qrcode'
import { requireTourFixture, tourFixture } from '../helpers/tour-fixture'
import { prepareSoftwareWebGL } from '../helpers/software-webgl'

const expect = baseExpect.configure({ timeout: 30_000 })

// The seeded tour's first step (tests/helpers/tour-fixture.ts): run
// scripts/seed-tour-navigation.ts once; TOUR_NAVIGATION_URL overrides it.
const tourURL = tourFixture?.url
test.beforeEach(async ({ page }) => {
  requireTourFixture()
  await prepareSoftwareWebGL(page)
})
// A passing run takes 20–40 s, the first one after a fresh `next dev` more
// (route compile): 3 minutes covers that without letting a broken scanner
// hold the suite for ten.
test.setTimeout(180_000)

for (const target of ['object', 'content'] as const) {
  test(`scans a canonical ${target} URL into the tour modal`, async ({ page, request }) => {
    const base = new URL(tourURL!)
    // The visitor had chosen another destination (Object 3) before scanning:
    // the scan page must bring them back to the same tour state.
    const destination = tourFixture!.objectIds[2]
    base.searchParams.set('to', destination)
    const objectURL = new URL('/api/objects', base)
    objectURL.searchParams.set('where[name][equals]', '[DEV] Tour navigation: Object 1')
    objectURL.searchParams.set('depth', '0')
    const response = await request.get(objectURL.toString())
    expect(response.ok()).toBe(true)
    const {
      docs: [object],
    } = await response.json()
    expect(object).toBeTruthy()
    const id = target === 'object' ? object.id : object.contents[0]
    const canonicalPath = `/en/${target}/${id}`
    const qr = await toDataURL(canonicalPath, { width: 480, margin: 4 })
    // Inside a navigation the scanner opens the scanned canonical link straight
    // in the contextual modal (QrScanPage), so the decode shows as the URL
    // leaving `/scan` for this tour's object/open modal.
    const decoded = () => !/\/scan(\?|$)/.test(new URL(page.url()).pathname)

    // Feed a real QR image through a synthetic camera; the scanner still decodes it.
    await page.addInitScript((imageURL) => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 480
        const image = new Image()
        image.src = imageURL
        await image.decode()
        const context = canvas.getContext('2d')!
        // `captureStream` only emits a frame when the canvas changes: drawn
        // once, the stream can stay empty and the scanner never sees the code.
        // Redrawing keeps frames flowing, like a real camera.
        const draw = () => context.drawImage(image, 0, 0)
        draw()
        setInterval(draw, 100)
        return canvas.captureStream(10)
      }
    }, qr)

    await page.goto(base.toString(), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main').locator('canvas')).toBeVisible({ timeout: 60_000 })
    // A click before hydration opens nothing: retry until the scanner's own
    // page (`/[lng]/scan?from=…`) is reached. The wait allows its first
    // compile on `next dev`; once there, the map's button is gone.
    await expect(async () => {
      await page
        .getByRole('button', { name: 'Scan a QR code', exact: true })
        .click({ timeout: 10_000 })
      await expect(page).toHaveURL(/\/scan\?from=/, { timeout: 20_000 })
    }).toPass({ timeout: 90_000 })
    await expect
      .poll(decoded, {
        message: 'The real scanner decodes the camera image and leaves the scanner',
        // A live camera decodes within seconds. This waited 5 minutes while the
        // scanner gave up on a slow camera start (startTimeoutMs in Scanner.tsx).
        timeout: 60_000,
      })
      .toBe(true)
    await expect(page).toHaveURL(
      target === 'object'
        ? /\/navigation\/tour\/[^/]+\/0\/object\//
        : /\/navigation\/tour\/[^/]+\/0\/open/,
      { timeout: 30_000 },
    )
    await expect(page.getByRole('dialog')).toHaveCount(1)
    if (target === 'content') {
      await expect(page.getByRole('button', { name: 'Go to next step', exact: true })).toBeVisible()
    }
    // Back on the same tour with the same state: the destination kept, and a
    // scan opens the work without confirming the position (no `at`).
    const scanned = new URL(page.url())
    expect(scanned.searchParams.get('to')).toBe(destination)
    expect(scanned.searchParams.has('at')).toBe(false)
    await expect(page.getByRole('main').locator('canvas')).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page).toHaveURL(base.toString())
  })
}

// Closing the scanner without scanning returns to the map as it was.
test('closing the scan page returns to the tour as it was', async ({ page }) => {
  const base = new URL(tourURL!)
  base.searchParams.set('to', tourFixture!.objectIds[2])
  await page.goto(base.toString(), { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('main').locator('canvas')).toBeVisible({ timeout: 60_000 })
  await expect(async () => {
    await page
      .getByRole('button', { name: 'Scan a QR code', exact: true })
      .click({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/scan\?from=/, { timeout: 20_000 })
  }).toPass({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Close the scanner', exact: true }).click()
  await expect(page).toHaveURL(base.toString(), { timeout: 30_000 })
  await expect(page.getByRole('main').locator('canvas')).toBeVisible({ timeout: 60_000 })
})

// Old in-map scanner links still work: they redirect to the scan page.
test('an old in-map scanner URL redirects to the scan page', async ({ page }) => {
  const base = new URL(tourURL!)
  await page.goto(new URL(`${base.pathname}/scan`, base).toString(), {
    waitUntil: 'domcontentloaded',
  })
  await expect(page).toHaveURL(/\/scan\?from=/)
  expect(new URL(page.url()).searchParams.get('from')).toBe(base.pathname)
})

/** The scan page's synthetic camera, showing a QR code of `value` (see the tests above). */
async function cameraShowing(page: Page, value: string) {
  const qr = await toDataURL(value, { width: 480, margin: 4 })
  await page.addInitScript((imageURL) => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 480
      const image = new Image()
      image.src = imageURL
      await image.decode()
      const context = canvas.getContext('2d')!
      const draw = () => context.drawImage(image, 0, 0)
      draw()
      setInterval(draw, 100)
      return canvas.captureStream(10)
    }
  }, qr)
}

/** The scan page opened as a navigation's Scan button opens it (`from` = that map). */
const scanPageFrom = (from: string) =>
  new URL(`/en/scan?${new URLSearchParams({ from })}`, tourURL!).toString()

// A tour's QR scanned during another visit opens that tour's own page, not a
// modal over the map the visitor came from.
test('a tour QR scanned from a tour opens the tour page', async ({ page }) => {
  const base = new URL(tourURL!)
  await cameraShowing(page, `/tour/${tourFixture!.tourId}`)
  await page.goto(scanPageFrom(base.pathname), { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(new RegExp(`/en/tour/${tourFixture!.tourId}$`), {
    timeout: 60_000,
  })
})

// From free navigation a scanned work opens as the free map's modal.
test('an object QR scanned from free navigation opens over the free map', async ({ page }) => {
  const free = `/en/museum/${tourFixture!.museumId}/navigation`
  const object = tourFixture!.objectIds[0]
  await cameraShowing(page, `/object/${object}`)
  await page.goto(scanPageFrom(`${free}?at=${object}`), { waitUntil: 'domcontentloaded' })
  // The free map's object modal, the position kept.
  await expect(page).toHaveURL(
    new URL(`${free}/object/${object}?at=${object}`, tourURL!).toString(),
    {
      timeout: 60_000,
    },
  )
  await expect(page.getByRole('dialog')).toHaveCount(1)
})

// A crafted `from` (another site) is ignored: the work opens as its own
// page and closing goes to the navigator, never to the other site.
test('a scan page whose from is another site ignores it', async ({ page }) => {
  const object = tourFixture!.objectIds[0]
  await cameraShowing(page, `/object/${object}`)
  await page.goto(scanPageFrom('//example.com/en/museum/x/navigation'), {
    waitUntil: 'domcontentloaded',
  })
  await expect(page).toHaveURL(new RegExp(`/en/object/${object}$`), { timeout: 60_000 })
})

test('closing a scan page with an outside from goes to the navigator', async ({ page }) => {
  await page.goto(scanPageFrom('https://example.com/'), { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Close the scanner', exact: true }).click()
  await expect(page).toHaveURL(/\/en\/navigator$/, { timeout: 30_000 })
})
