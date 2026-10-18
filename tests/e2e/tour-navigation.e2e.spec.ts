import { expect as baseExpect, test } from '@playwright/test'

const expect = baseExpect.configure({ timeout: 30_000 })

// Run the seed once, then set TOUR_NAVIGATION_URL to the URL it prints.
const tourURL = process.env.TOUR_NAVIGATION_URL
test.skip(!tourURL, 'Run scripts/seed-tour-navigation.ts and set TOUR_NAVIGATION_URL first.')
test.setTimeout(300_000)

test('shows the map on desktop and mobile', async ({ page }) => {
  await page.goto(tourURL!, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('canvas')).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.locator('canvas')).toBeVisible()
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
  await expect(page.locator('canvas')).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search', exact: true }).fill('Object 3')
  await page
    .getByRole('button', { name: '[DEV] Tour navigation: Object 3 Object', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/navigation\/0\/object\//)
  await page
    .getByRole('button', { name: '[DEV] Tour navigation: Side discovery', exact: true })
    .click()
  await expect(page).toHaveURL(/\/navigation\/0\/content\//)
  await expect(page.getByRole('button', { name: 'Go to next step' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Set as my position', exact: true }).click()
  await expect(page).toHaveURL(/\/navigation\/0\?at=/)
  const position = new URL(page.url()).searchParams.get('at')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Open next stop' })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('at')).toBe(position)
  await page.getByRole('button', { name: 'Open next stop' }).click()
  await expect(page).toHaveURL(/\/navigation\/0\/open\?at=/)
  await page.getByRole('button', { name: 'Go to next step' }).click()
  await expect(page).toHaveURL(/\/navigation\/1\?at=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open next stop' }).click()
  await page.getByRole('button', { name: 'Complete tour' }).click()
  await expect(page).toHaveURL(/\/navigation\/2\?at=/)
  await expect(page.getByText('Tour completed', { exact: true })).toBeVisible()
  expect(renderingErrors).toEqual([])
})
