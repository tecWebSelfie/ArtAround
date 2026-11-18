import { devices, expect, test, type Page } from '@playwright/test'
import { tourFixture } from '../helpers/tour-fixture'
import {
  collectWebVitals,
  formatWebVitals,
  readWebVitals,
  type VitalName,
  type Vitals,
} from '../helpers/web-vitals'

/**
 * Core Web Vitals budgets (tests/helpers/web-vitals.ts) on the pages a
 * visitor lands on: lab numbers in a phone-sized Chromium, measured as part
 * of the e2e suite so CI checks them on every pull request with no extra job.
 *
 * The three Core Web Vitals must be rated "good" by Google's thresholds
 * (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms). LCP is budgeted only on the
 * production server (CI, or `E2E_SERVER=start` after `pnpm build`): on
 * `next dev` each route compiles on its first visit, so it is only
 * reported there. Layout shifts and interaction latency don't depend on
 * compilation, so CLS and INP are budgeted on both. FCP and TTFB are
 * reported, not budgeted: TTFB of a server-rendered page on a shared CI
 * runner says more about the runner than about the page.
 *
 * The values of every run are attached to the HTML report and printed.
 * Field data from real visitors is Sentry's (its browser tracing records
 * Web Vitals in production): see docs/development.md → Core Web Vitals.
 */
const productionServer = !!process.env.CI || process.env.E2E_SERVER === 'start'
const budgeted: VitalName[] = productionServer ? ['LCP', 'CLS', 'INP'] : ['CLS', 'INP']

const origin = tourFixture ? new URL(tourFixture.url).origin : 'http://localhost:3000'

// A phone, where most visits happen; Playwright refuses a browser type in
// `test.use`, the project already picks Chromium.
const { defaultBrowserType: _browser, ...phone } = devices['Pixel 7']
test.use(phone)
test.setTimeout(180_000)

async function expectGoodVitals(page: Page) {
  // LCP and CLS settle after load; give late images and fonts a moment.
  await page.waitForLoadState('load')
  await page.waitForTimeout(1_000)
  const vitals: Vitals = await readWebVitals(page)
  const summary = formatWebVitals(vitals)
  console.log(`${page.url()}\n${summary}`)
  await test.info().attach('web-vitals', { body: summary, contentType: 'text/plain' })

  for (const name of budgeted) {
    const vital = vitals[name]
    // An unreported metric means nothing happened to measure: no shift for
    // CLS, no interaction slower than 16 ms for INP.
    if (!vital && (name === 'CLS' || name === 'INP')) continue
    expect(vital, `${name} was not reported`).toBeDefined()
    expect(vital!.rating, `${name}\n${summary}`).toBe('good')
  }
}

test('navigator home stays within the Core Web Vitals budgets', async ({ page }) => {
  await collectWebVitals(page)
  await page.goto(`${origin}/en/navigator`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // One real interaction for INP: the museum picker opens its menu.
  await page.getByRole('button', { name: /^Museum:/ }).click()
  await page.keyboard.press('Escape')
  await expectGoodVitals(page)
})

test('marketplace stays within the Core Web Vitals budgets', async ({ page }) => {
  await collectWebVitals(page)
  await page.goto(`${origin}/en/marketplace`)
  await expect(page.getByRole('main')).toBeVisible()
  await expectGoodVitals(page)
})
