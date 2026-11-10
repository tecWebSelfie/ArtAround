import { expect, test } from '@playwright/test'
import { tourFixture } from '../helpers/tour-fixture'

/** Read-only live acceptance: real browser requests, no MSW, HAR replay or route interception. */
const museumURL =
  process.env.MUSEUM_LOCATION_LIVE_URL ??
  (tourFixture ? new URL(`/en/museum/${tourFixture.museumId}`, tourFixture.url).href : undefined)

test.beforeEach(() => {
  if (!museumURL)
    throw new Error(
      'Set MUSEUM_LOCATION_LIVE_URL to an English museum page with a saved point, or run pnpm seed:e2e.',
    )
})

test('Photon returns real addresses usable by the browser', async ({ page }) => {
  await page.goto(museumURL!, { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(async (endpoint) => {
    const url = new URL('/api/', endpoint)
    url.search = new URLSearchParams({
      q: 'Pinacoteca di Brera Milano',
      lang: 'en',
      limit: '3',
    }).toString()
    // Running in the actual page also checks provider CORS, unlike a Node-only HTTP probe.
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    return { status: response.status, body: await response.json() }
  }, process.env.NEXT_PUBLIC_PHOTON_ENDPOINT || 'https://photon.komoot.io')
  expect(result.status).toBe(200)
  expect(result.body.type).toBe('FeatureCollection')
  // OSM names/rankings may change; assert the address/Point contract instead of one exact label.
  expect(result.body.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'Feature',
        geometry: expect.objectContaining({ type: 'Point', coordinates: expect.any(Array) }),
        properties: expect.any(Object),
      }),
    ]),
  )
  const [longitude, latitude] = result.body.features[0].geometry.coordinates
  expect(Number.isFinite(longitude) && Math.abs(longitude) <= 180).toBe(true)
  expect(Number.isFinite(latitude) && Math.abs(latitude) <= 90).toBe(true)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`OpenFreeMap renders real ${scheme} tiles and the museum marker`, async ({
    page,
  }, testInfo) => {
    // Mantine's persistent scheme setting selects the real component branch without changing app code.
    await page.addInitScript(
      (value) => localStorage.setItem('mantine-color-scheme-value', value),
      scheme,
    )
    const style = scheme === 'dark' ? 'dark' : 'bright'
    const styleResponse = page.waitForResponse(
      (response) =>
        response.url().split('?')[0] === `https://tiles.openfreemap.org/styles/${style}` &&
        response.ok(),
    )
    const tileResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.hostname === 'tiles.openfreemap.org' &&
        url.pathname.includes('/planet/') &&
        url.pathname.endsWith('.pbf') &&
        response.ok()
      )
    })
    const map = page.getByRole('region', { name: 'Museum location' })
    // Observe before opening Info; also handle every wait if navigation or a provider fails.
    const [styleResult, tileResult] = await Promise.all([
      styleResponse,
      tileResponse,
      (async () => {
        await page.goto(museumURL!, { waitUntil: 'domcontentloaded' })
        await page.getByRole('tab', { name: 'Info', exact: true }).click()
        await expect(map).toBeVisible()
        await expect(map).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 })
        await expect(map.locator('.rmp-marker--destination')).toBeVisible()
      })(),
    ])
    expect((await styleResult.json()).version).toBe(8)
    expect((await tileResult.body()).byteLength).toBeGreaterThan(0)
    // Unlike the ordinary empty-background fixtures, acceptance must load real vector tiles.
    await map.screenshot({ path: testInfo.outputPath(`openfreemap-${scheme}.png`) })
  })
}
