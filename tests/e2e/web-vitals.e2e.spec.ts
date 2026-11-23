import { devices, expect, test } from '@playwright/test'
import { isProductionServer } from '../helpers/e2e-server'
import { collectWebVitals, expectGoodVitals } from '../helpers/web-vitals'

/**
 * Lab performance budgets (tests/helpers/web-vitals.ts) on the pages a
 * visitor lands on: measured in a phone-sized Chromium as part of the e2e
 * suite, so CI checks them on every pull request with no extra job. CLS and
 * LCP must be "good"; INP fails the spec only at "poor", the regression
 * ceiling a shared runner can judge (the CWV "good" boundary sits inside its
 * noise). The values of every run are printed and attached to the HTML
 * report. Field data from real visitors is Sentry's: see
 * docs/development.md → Core Web Vitals.
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

test('navigator home stays within the lab performance budgets', async ({ page }) => {
  await collectWebVitals(page)
  await page.goto(`${origin}/en/navigator`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // One real interaction for INP: the museum picker opens its menu.
  await page.getByRole('button', { name: /^Museum:/ }).click()
  await page.keyboard.press('Escape')
  await expectGoodVitals(page)
})

test('marketplace stays within the lab performance budgets', async ({ page }) => {
  await collectWebVitals(page)
  await page.goto(`${origin}/en/marketplace`)
  await expect(page.getByRole('main')).toBeVisible()
  await expectGoodVitals(page)
})

// Regression for the 23 Nov 2026 incident: both deploys of that day shipped
// a build whose HTML listed 15 chunk files it had never written to disk, so
// no page hydrated and the dynamic routes answered 500 — while the budgets
// above stayed green, because inert prerendered HTML still paints and a
// click lands silently on a page with no JavaScript attached. The served
// build's completeness is the invariant that goes red instead: everything
// the served HTML references must load, and a route rendered on demand
// must render. These tests run wherever this spec runs — on CI's
// production build (a broken build goes red before it can deploy) and in
// the canary against what is actually live.
test('the served build is complete: every referenced asset loads', async ({ request }) => {
  const home = await request.get(`${origin}/en/navigator`)
  expect(home.status()).toBe(200)
  const html = await home.text()
  // The pages reference their assets as plain /_next/static/ paths in the
  // script and link tags; the RSC payload escapes them, which this regex
  // deliberately does not need to parse.
  const assets = [...new Set(html.match(/\/_next\/static\/[A-Za-z0-9._/-]+/g) ?? [])]
  expect(assets.length, 'the navigator page references its static assets').toBeGreaterThan(0)
  for (const asset of assets) {
    const res = await request.get(`${origin}${asset}`)
    expect(
      res.status(),
      `${asset} must be served — a referenced file the build never wrote shows up here`,
    ).toBe(200)
  }
})

test('a dynamic route renders after the deploy', async ({ request }) => {
  const home = await request.get(`${origin}/en/marketplace`)
  expect(home.status()).toBe(200)
  const html = await home.text()
  // Any public entry page does: museums and tours render on demand, the
  // exact route class that answered 500 in the incident while prerendered
  // pages stayed 200. CI visits its seeded fixture, the canary the live
  // site, and both always list their entries.
  const link = html.match(/href="(\/[a-z]{2}\/(?:museum|tour)\/[a-f0-9]{8,})"/)?.[1]
  expect(link, 'the marketplace lists a museum or tour to visit').toBeDefined()
  const res = await request.get(`${origin}${link}`)
  expect(res.status(), `${link} must render on demand`).toBe(200)
})
