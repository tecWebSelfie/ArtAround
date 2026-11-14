import { expect as baseExpect, test } from '@playwright/test'
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
    // A click before hydration opens nothing, so the click is retried, but only
    // while the scanner has not opened: once `/scan` is up its overlay covers the
    // button, and a second click would be intercepted (the flake under load).
    // The wait after each click is long enough for a loaded machine to navigate;
    // a fast decode may already have moved past `/scan`, which counts as opened.
    const scannerOpened = () => {
      // The tour's own step URL is where the click starts: any other path is
      // the scanner or the modal a quick decode already navigated to.
      return new URL(page.url()).pathname !== base.pathname
    }
    await expect(async () => {
      if (!scannerOpened()) {
        await page.getByRole('button', { name: 'Scan', exact: true }).click({ timeout: 10_000 })
      }
      await expect.poll(scannerOpened, { timeout: 15_000 }).toBe(true)
    }).toPass({ timeout: 60_000 })
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
    expect(new URL(page.url()).searchParams.has('at')).toBe(false)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page).toHaveURL(base.toString())
  })
}
