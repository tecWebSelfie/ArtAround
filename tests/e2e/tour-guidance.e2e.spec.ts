import { expect as baseExpect, test } from '@playwright/test'
import { requireTourFixture, tourFixture } from '../helpers/tour-fixture'

/**
 * Full-flow checks for route guidance on the real Next app (real API routes,
 * real seeded tour): simulated GPS → directions step → nearby suggestion.
 * The voice turn is in voice-assistant.e2e.spec.ts (it needs its own browser).
 *
 * Needs `pnpm exec tsx scripts/seed-tour-navigation.ts` (writes the fixture
 * JSON read below) and a dev server with NEXT_PUBLIC_GPS_SIMULATOR=true. Fixture map: West hall (x 0–6)
 * holds Object 1; East hall (x 6–12) holds Objects 2 and 3. Object 3 carries
 * "Side discovery", the content that is not part of the tour.
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

test('simulated GPS offers the nearby destination without silently confirming position', async ({
  page,
}) => {
  // Guidance choices are per-device settings in localStorage (useLocalStorage → JSON).
  await page.addInitScript(() => {
    localStorage.setItem('aa-gps', '"simulated"')
    localStorage.setItem('aa-nearby-suggestions', 'true')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(routeURL(), { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Start in West hall')).toBeVisible({ timeout: 180_000 })
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible()

  // 6 m east and 2 m south: from Object 1 (x 2, z 2) to (8, 4), inside the East
  // hall and clearly past the 5 m first leg once snapped onto the route.
  const east = page.getByRole('button', { name: 'Walk east' })
  for (let press = 0; press < 3; press++) await east.click()
  await page.getByRole('button', { name: 'Walk south' }).click()

  // The estimate snaps onto the route past the hall boundary, so the bar has
  // left the first step (entering the East hall, or arriving).
  await expect(page.getByText(/Step 1 of 3/)).toHaveCount(0)
  // The direction-aware proximity notice replaces the old room-level content carousel.
  await expect(page.getByRole('heading', { name: 'Your next stop is nearby' })).toBeVisible()
  const destination = '[DEV] Tour navigation: Object 3'
  await expect(page.getByRole('button', { name: `Open ${destination}`, exact: true })).toBeVisible()
  expect(new URL(page.url()).searchParams.get('at')).toBe(fixture!.objectIds[0])
  expect(new URL(page.url()).searchParams.get('to')).toBe(fixture!.objectIds[2])
  await page.getByRole('button', { name: `Confirm position at ${destination}` }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('at')).toBe(fixture!.objectIds[2])
})
