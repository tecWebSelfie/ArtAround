import { expect as baseExpect, test } from '@playwright/test'
import { toDataURL } from 'qrcode'

const expect = baseExpect.configure({ timeout: 30_000 })

const tourURL = process.env.TOUR_NAVIGATION_URL
test.skip(!tourURL, 'Run scripts/seed-tour-navigation.ts and set TOUR_NAVIGATION_URL first.')
test.setTimeout(600_000)

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
        canvas.getContext('2d')!.drawImage(image, 0, 0)
        return canvas.captureStream(10)
      }
    }, qr)

    await page.goto(base.toString(), { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main').locator('canvas')).toBeVisible({ timeout: 60_000 })
    // A click before hydration opens nothing: retry until the scanner is up.
    await expect(async () => {
      await page.getByRole('button', { name: 'Scan', exact: true }).click({ timeout: 2_000 })
      await expect(page).toHaveURL(/\/scan(\?|$)/, { timeout: 2_000 })
    }).toPass({ timeout: 60_000 })
    await expect
      .poll(decoded, {
        message: 'The real scanner decodes the camera image and leaves the scanner',
        timeout: 300_000,
      })
      .toBe(true)
    await expect(page).toHaveURL(
      target === 'object'
        ? /\/navigation\/tour\/[^/]+\/0\/object\//
        : /\/navigation\/tour\/[^/]+\/0\/open/,
      { timeout: 300_000 },
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
