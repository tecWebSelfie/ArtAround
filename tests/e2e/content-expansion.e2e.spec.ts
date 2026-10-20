import { expect as baseExpect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Full-flow checks of the language-model features on the real Next app (real
 * Groq, Wikidata and Wikipedia calls, real seeded tour):
 *
 * - "Tell me more" and "Simpler" in a tour content modal;
 * - "Plan my visit" from the form to the preview;
 * - "Change museum" by importing a museum config file.
 *
 * Needs `pnpm exec tsx scripts/seed-tour-navigation.ts` and a dev server.
 * Set `E2E_SCREENSHOTS=<dir>` to keep a screenshot of each screen.
 */
const expect = baseExpect.configure({ timeout: 60_000 })
const fixturePath = resolve('.e2e-fixtures/tour-navigation-fixture.json')
const fixture = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      url: string
      museumId: string
      objectIds: string[]
    })
  : null
const shots = process.env.E2E_SCREENSHOTS
/** The config has no baseURL: pages live on the fixture's server. */
const at = (path: string) => `${new URL(fixture!.url).origin}${path}`
test.beforeEach(() => {
  test.skip(!fixture?.objectIds, 'Run scripts/seed-tour-navigation.ts first.')
  test.setTimeout(300_000)
})

test('a tour content modal adds "Tell me more" text and a simpler version', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // `/open` is the next stop's content modal.
  await page.goto(`${fixture!.url}/open`, { waitUntil: 'domcontentloaded' })
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Curiosities' }).click()
  await expect(page).toHaveURL(/more=curiosities/)
  // The text arrives as whole paragraphs inside the modal, not as a chat.
  await expect(modal.locator('[aria-live="polite"] p').first()).toBeVisible()
  await expect(modal.locator('[aria-live="polite"]')).toHaveAttribute('aria-busy', 'false')
  // Paragraphs fade in over ~0.4 s; let them settle before the screenshot.
  if (shots) await page.waitForTimeout(600)
  if (shots) await page.screenshot({ path: `${shots}/expansion-mobile.png`, fullPage: true })

  await modal.getByRole('button', { name: 'For children' }).click()
  await expect(page).toHaveURL(/audience=children/)
  await expect(page).not.toHaveURL(/more=/)
  await expect(modal.locator('[aria-live="polite"] p').first()).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/version-mobile.png`, fullPage: true })
})

test('"Plan my visit" turns the form into a tour preview', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(at('/en/tour/plan'), { waitUntil: 'domcontentloaded' })
  // Typing before hydration is lost (dev builds hydrate slowly): retry the
  // search until the option list answers.
  const museum = page.getByRole('combobox', { name: 'Museum' })
  await expect(async () => {
    await museum.fill('')
    await museum.fill('[DEV]')
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 120_000 })
  await page.getByRole('option').first().click()
  await page.getByText('30 min').click()
  await page.getByRole('textbox', { name: 'Interests' }).fill('Something for curious kids')
  if (shots) await page.screenshot({ path: `${shots}/plan-form.png`, fullPage: true })
  await page.getByRole('button', { name: 'Plan my visit' }).click()
  await expect(page.getByRole('button', { name: 'Start the visit' })).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/plan-preview.png`, fullPage: true })
  await page.getByRole('button', { name: 'Start the visit' }).click()
  await expect(page).toHaveURL(/\/tour\/[a-f0-9]+\/navigation\/0/)
})

test('importing a museum config file locks the app to that museum', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(at('/en/navigator'), { waitUntil: 'domcontentloaded' })
  // A click before hydration opens nothing: retry until the dialog is up.
  await expect(async () => {
    await page.getByRole('button', { name: 'Change museum' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 120_000 })
  if (shots) await page.screenshot({ path: `${shots}/museum-switch.png` })
  const config = JSON.stringify([{ id: fixture!.museumId, name: '[DEV] Tour navigation 3' }])
  await page.locator('input[type="file"]').setInputFiles({
    name: 'museum.json',
    mimeType: 'application/json',
    buffer: Buffer.from(config),
  })
  await expect(page.getByRole('button', { name: 'Change museum' })).toHaveText(
    /\[DEV\] Tour navigation/,
  )
  // Back to global mode.
  await page.getByRole('button', { name: 'Change museum' }).click()
  await page.getByRole('button', { name: 'Back to all museums' }).click()
  await expect(page.getByRole('button', { name: 'Change museum' })).toHaveText('All museums')
})
