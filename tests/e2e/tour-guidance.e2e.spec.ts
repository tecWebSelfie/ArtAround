import { expect as baseExpect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
const fixturePath = resolve('.e2e-fixtures/tour-navigation-fixture.json')
const fixture = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, 'utf8')) as { url: string; objectIds: string[] })
  : null
test.beforeEach(() => {
  test.skip(!fixture?.objectIds, 'Run scripts/seed-tour-navigation.ts first.')
  test.setTimeout(300_000)
})

/** At Object 1 (West hall), heading to Object 3 (East hall). */
const routeURL = () => {
  const [start, , end] = fixture!.objectIds
  return `${fixture!.url}?at=${start}&to=${end}`
}

test('simulated GPS advances the directions and suggests the room’s off-tour content', async ({
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
  await expect(page.getByText('Nearby in East hall')).toBeVisible()
  await expect(page.getByText('[DEV] Tour navigation: Side discovery').first()).toBeVisible()
  // "Go there" makes Object 3 the destination through the URL.
  await page.getByRole('button', { name: 'Go there' }).click()
  await expect(page).toHaveURL(new RegExp(`to=${fixture!.objectIds[2]}`))
})
