import { expect as baseExpect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { requireTourFixture, tourFixture } from '../helpers/tour-fixture'

/**
 * One real voice turn through the orb on the seeded tour, with a WAV file as
 * the microphone: tap → Silero VAD hears the sentence end and closes the mic
 * → /api/assistant (Groq Whisper + one model call) → the browser runs the
 * chosen command. Needs the seed (scripts/seed-tour-navigation.ts) and either
 * GROQ_API_KEY / FISH_API_KEY or AI_MOCK=true, whose transcript is this WAV's
 * request (src/lib/ai-mock.ts).
 */
const expect = baseExpect.configure({ timeout: 60_000 })
// Seeded by scripts/seed-tour-navigation.ts (see tests/helpers/tour-fixture.ts).
const fixture = tourFixture
test.beforeEach(() => {
  requireTourFixture()
  test.setTimeout(300_000)
})

/** At Object 1 (West hall), heading to Object 3 (East hall). */
const routeURL = () => {
  const [start, , end] = fixture!.objectIds
  return `${fixture!.url}?at=${start}&to=${end}`
}

// Chromium reads this WAV as the microphone (1 s silence, the request, 3 s silence).
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${resolve('tests/e2e/fixtures/open-side-discovery.wav')}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
  permissions: ['microphone'],
})

test('a spoken request runs the matching command', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aa-assistant', 'true'))
  await page.goto(routeURL(), { waitUntil: 'domcontentloaded' })

  const orb = page.locator('button[data-state]')
  await expect(orb).toHaveAttribute('data-state', 'ready', { timeout: 180_000 })
  const turn = page.waitForResponse((response) => response.url().endsWith('/api/assistant'))
  await orb.click()
  await expect(orb).toHaveAttribute('data-state', 'listening')

  // Voice activity detection closes the mic by itself after the sentence.
  const response = await turn
  const body = (await response.json()) as { transcript: string; commandId: string | null }
  // Chromium loops the WAV from browser launch, so the mic can open mid-sentence
  // and catch only its end; the model still has the destination as context.
  expect(body.transcript.trim()).not.toBe('')
  expect(body.commandId).toMatch(/^content:/)
  // The browser ran the command: the content opened in its modal route.
  await expect(page).toHaveURL(/\/navigation\/tour\/[^/]+\/0\/content\//)
  await expect(page.getByText(/Side discovery/).first()).toBeVisible()
})
