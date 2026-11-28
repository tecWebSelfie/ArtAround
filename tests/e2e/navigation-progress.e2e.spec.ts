import { expect, type Page, test } from '@playwright/test'

const origin = 'http://localhost:3000'

/**
 * The global navigation bar (NavigationProgressBar + src/lib/navigation-progress.ts):
 * a page change that waits on the server lights the bar at the top edge, and
 * it goes away once the new URL commits; a link opened in a new tab never
 * lights it. Navigation requests are slowed with `page.route` (only the RSC
 * fetch of a real navigation, never a prefetch), so the wait is deterministic
 * on the dev server and on the production build alike.
 */

async function slowNavigations(page: Page, ms: number) {
  await page.route('**/*', async (route) => {
    const headers = route.request().headers()
    const navigation =
      headers['rsc'] && !headers['next-router-prefetch'] && !headers['next-router-segment-prefetch']
    if (navigation) await new Promise((resolve) => setTimeout(resolve, ms))
    await route.continue()
  })
}

test.describe('Navigation progress', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    // Warm the destination first: on `next dev` its first compile would
    // otherwise dominate the timings below.
    await page.goto(`${origin}/en/marketplace`, { timeout: 120_000 })
    await page.goto(`${origin}/en/navigator`, { timeout: 120_000 })
  })

  test('a slow page change shows the bar until the new page commits', async ({ page }) => {
    const bar = page.getByTestId('navigation-progress')
    // Idle: hidden from assistive tech (Mantine keeps it in the DOM at 0%).
    await expect(bar).toHaveAttribute('aria-hidden', 'true')
    await expect(bar).not.toHaveAttribute('data-mounted')

    await slowNavigations(page, 2_000)
    // The site header's tab entry (Desktop Chrome viewport, ≥ md).
    await page.getByRole('banner').getByRole('link', { name: 'Marketplace' }).click()

    await expect(bar).toHaveAttribute('data-mounted', 'true')
    await expect(bar).toHaveAttribute('aria-hidden', 'false')
    await expect(page).toHaveURL(`${origin}/en/marketplace`, { timeout: 60_000 })
    await expect(bar).not.toHaveAttribute('data-mounted')
  })

  test('a link opened in a new tab never lights the bar', async ({ page, context }) => {
    // The bar renders in a portal once the client has hydrated.
    await expect(page.getByTestId('navigation-progress')).toBeAttached()
    await slowNavigations(page, 2_000)
    // Sample every attribute change: the bar must never mount, not even briefly.
    await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="navigation-progress"]')!
      new MutationObserver(() => {
        if (bar.hasAttribute('data-mounted')) document.body.dataset.barSeen = 'true'
      }).observe(bar, { attributes: true })
    })
    const opened = context.waitForEvent('page')
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Marketplace' })
      .click({ modifiers: ['ControlOrMeta'] })
    await (await opened).close()
    await page.waitForTimeout(1_000)
    expect(await page.evaluate(() => document.body.dataset.barSeen)).toBeUndefined()
    await expect(page).toHaveURL(`${origin}/en/navigator`)
  })
})
