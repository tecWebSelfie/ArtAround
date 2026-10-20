import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // The root redirects to the localized navigator home.
    await expect(page).toHaveURL(/\/[a-z]{2}\/navigator$/)
    await expect(page).toHaveTitle(/Artaround/)

    const heading = page.locator('h1').first()

    await expect(heading).toContainText('Artaround')
  })
})
