import { expect, Page, test } from '@playwright/test'
import { requireTourFixture } from '../helpers/tour-fixture'

const origin = 'http://localhost:3000'

/**
 * Back affordances that follow the app's navigation flow. The editor Cancel
 * buttons leave for their page's parent — never a raw `router.back()`, which
 * can leave the app when the editor was opened from a shared link — and the
 * quiz's way out is an explicit Close that keeps the answers, while the
 * browser's Back walks the questions (one pushed history entry per `?q=`).
 */
test.describe('Back navigation', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    page = await context.newPage()
    // The base seed's dev/test super admin (`pnpm seed:e2e`): the editor pages
    // redirect to sign-in without a session.
    const login = await page.request.post(`${origin}/api/users/login`, {
      data: { username: 'dev', password: 'test' },
    })
    expect(login.status()).toBe(200)
  })

  test('editor Cancel leaves for the tour page, not the history', async () => {
    const { tourId } = requireTourFixture()
    test.setTimeout(180_000)
    // Direct visit, as if the editor URL had been shared: no in-app history.
    await page.goto(`${origin}/en/tour/${tourId}/edit`, { timeout: 120_000 })
    await expect(page.getByRole('heading', { name: 'Edit tour' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    // A dev server compiles the target route on the first push there; CI's
    // production build is warm. The URL commit waits for that compile.
    await expect(page).toHaveURL(`${origin}/en/tour/${tourId}`, { timeout: 60_000 })
  })

  test('museum Cancel leaves for the navigator', async () => {
    test.setTimeout(180_000)
    await page.goto(`${origin}/en/museum/new`, { timeout: 120_000 })
    await expect(page.getByRole('heading', { name: 'New museum' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(`${origin}/en/navigator`)
  })

  test('Cancel from a new tour stop restores the tour editor draft', async () => {
    const { tourId } = requireTourFixture()
    test.setTimeout(180_000)
    const marker = 'Draft kept through Cancel'
    await page.goto(`${origin}/en/tour/${tourId}/edit`, { timeout: 120_000 })
    await page.getByLabel('Title').fill(marker)
    // "Write a new content" is a Mantine Button rendered as a Link: role link.
    await page.getByRole('link', { name: 'Write a new content' }).click()
    await expect(page).toHaveURL(/\/en\/content\/new\?/, { timeout: 120_000 })
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Back on the editor with the draft restored (?draft=1, then normalized
    // away). The pre-fix router.back() lost these edits instead.
    await expect(page).toHaveURL(new RegExp(`/en/tour/${tourId}/edit(\\?|$)`), {
      timeout: 60_000,
    })
    await expect(page.getByLabel('Title')).toHaveValue(marker, { timeout: 30_000 })
  })

  test('the quiz way out is a Close: the map, with progress kept', async () => {
    const { tourId, museumId } = requireTourFixture()
    test.setTimeout(180_000)
    await page.goto(`${origin}/en/tour/${tourId}/quiz`, { timeout: 120_000 })
    await page.getByRole('button', { name: 'Start the quiz' }).click()
    await expect(page).toHaveURL(/\/quiz\?q=1$/)
    // Answer question 1 (any option locks in; questions arrive shuffled).
    const answers = page
      .getByRole('group', { name: /Which hall|How many stops/ })
      .getByRole('button')
    await answers.first().click()
    await expect(page.getByText(/Correct!|Not quite\./).first()).toBeVisible()
    // The header's X (not a back arrow) leaves for the tour's map at the cursor.
    await page.getByLabel('Leave the quiz and return to the map').click()
    await expect(page).toHaveURL(
      new RegExp(`/en/museum/${museumId}/navigation/tour/${tourId}/\\d+`),
      // The map route compiles on its first visit under `next dev`.
      { timeout: 90_000 },
    )
    // Progress survives the exit: the intro offers to resume at question 2.
    await page.goto(`${origin}/en/tour/${tourId}/quiz`, { timeout: 120_000 })
    await expect(page.getByRole('button', { name: /Resume at question 2/ })).toBeVisible({
      timeout: 30_000,
    })
  })
})
