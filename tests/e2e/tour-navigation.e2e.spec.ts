import { expect as baseExpect, test, type Page } from '@playwright/test'
import { requireTourFixture, tourFixture } from '../helpers/tour-fixture'

const expect = baseExpect.configure({ timeout: 30_000 })

// The seeded tour's first step (tests/helpers/tour-fixture.ts): run
// scripts/seed-tour-navigation.ts once; TOUR_NAVIGATION_URL overrides it.
const tourURL = tourFixture?.url
test.beforeEach(() => {
  requireTourFixture()
})
test.setTimeout(300_000)

// The map's own canvas (the assistant orb draws another one outside `main`).
const mapCanvas = (page: Page) => page.getByRole('main').locator('canvas')

test('shows the map on desktop and mobile', async ({ page }) => {
  await page.goto(tourURL!, { waitUntil: 'domcontentloaded' })
  await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(mapCanvas(page)).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(mapCanvas(page)).toBeVisible()
})

// Product rule: an unavailable stop is intercepted before navigation and never
// shown (no "Skipped" badge, no blocking modal). The fixture's second tour has
// a stop about no object between its two real ones (scripts/seed-tour-navigation.ts):
// the visitor sees a two-stop tour, and every cursor counts those two.
test('shows and counts only the visitable stops of a tour with an unavailable one', async ({
  page,
}) => {
  const fixture = requireTourFixture()
  if (!fixture.unavailableTourId) {
    if (process.env.CI) throw new Error('Fixture without the unavailable-stop tour: pnpm seed:e2e')
    test.skip(true, 'Fixture without the unavailable-stop tour: run `pnpm seed:e2e` again.')
  }
  const base = `${new URL(fixture.url).origin}/en/museum/${fixture.museumId}/navigation/tour/${fixture.unavailableTourId}`
  await page.goto(`${base}/0`, { waitUntil: 'domcontentloaded' })
  await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Stop 1 of 2/)).toBeVisible()
  // Both visitable stops are in the stepper; the unavailable one is nowhere,
  // and nothing announces it (no badge, no modal).
  await expect(page.getByText('[DEV] Tour navigation: First stop', { exact: true })).toBeVisible()
  await expect(page.getByText('[DEV] Tour navigation: Second stop', { exact: true })).toBeVisible()
  await expect(
    page.getByText('[DEV] Tour navigation: Unavailable stop', { exact: true }),
  ).toHaveCount(0)
  await expect(page.getByText('Skipped')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // The cursor indexes the visitable list: step 1 is the second real stop.
  await page.goto(`${base}/1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Stop 2 of 2/)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto(`${base}/2`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('All 2 stops visited')).toBeVisible()
  // A stale cursor (a bookmark from before a stop was removed, or the old
  // three-stop numbering) lands on the completed step instead of an error.
  await page.goto(`${base}/3?at=${fixture.objectIds[0]}`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(`${base}/2?at=${fixture.objectIds[0]}`)
  await expect(page.getByText('All 2 stops visited')).toBeVisible()
})

test('keeps side exploration separate, shares position through reload, and completes both stops', async ({
  page,
}) => {
  const renderingErrors: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Material .*not compatible|Render pass failed|Fallback render failed/.test(message.text())
    ) {
      renderingErrors.push(message.text())
    }
  })
  await page.goto(tourURL!, { waitUntil: 'domcontentloaded' })
  await expect(mapCanvas(page)).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill('Object 3')
  await page
    .getByRole('button', { name: '[DEV] Tour navigation: Object 3 Object', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/0\/object\//)
  await page
    .getByRole('button', { name: '[DEV] Tour navigation: Side discovery', exact: true })
    .click()
  await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/0\/content\//)
  await expect(page.getByRole('button', { name: 'Go to next step' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Set as my position', exact: true }).click()
  await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/0\?at=/)
  const position = new URL(page.url()).searchParams.get('at')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Open next stop' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('at')).toBe(position)
  // A click right after the reload can land before hydration: retry it.
  await expect(async () => {
    if (!(await page.getByRole('dialog').isVisible())) {
      await page.getByRole('button', { name: 'Open next stop' }).click({ timeout: 2_000 })
    }
    await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/0\/open\?at=/, { timeout: 5_000 })
  }).toPass({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Go to next step' }).click()
  await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/1\?at=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open next stop' }).click()
  // The seed gives the fixture tour a quiz: completing its last stop opens it.
  await page.getByRole('button', { name: 'Complete and go to the quiz' }).click()
  await expect(page).toHaveURL(/\/quiz\?.*from=2/)
  if (/\/navigation\/tour\/[^/]+\/2(?:[/?]|$)/.test(page.url())) {
    await expect(page.getByText('Tour completed', { exact: true })).toBeVisible()
  }
  expect(renderingErrors).toEqual([])
})
