import { devices, expect, test } from '@playwright/test'
import { isProductionServer } from '../helpers/e2e-server'
import { collectWebVitals, expectGoodVitals } from '../helpers/web-vitals'

/**
 * Core Web Vitals budgets (tests/helpers/web-vitals.ts) on the pages a
 * visitor lands on: lab numbers in a phone-sized Chromium, measured as part
 * of the e2e suite so CI checks them on every pull request with no extra job.
 * The values of every run are printed and attached to the HTML report.
 * Field data from real visitors is Sentry's: see docs/development.md → Core
 * Web Vitals.
 */
const origin = process.env.E2E_ORIGIN ?? 'http://localhost:3000'

// A phone, where most visits happen; Playwright refuses a browser type in
// `test.use`, the project already picks Chromium.
const { defaultBrowserType: _browser, ...phone } = devices['Pixel 7']
test.use(phone)
test.setTimeout(180_000)
// `next dev` compiles on first use and injects styles from JavaScript: its
// numbers are neither the production ones nor stable from run to run.
test.skip(
  !isProductionServer(),
  'Web Vitals are measured on the production build (E2E_SERVER=start)',
)

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
