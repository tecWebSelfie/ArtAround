import { expect as baseExpect, test, type Page } from '@playwright/test'
import { MUSEUM_MODE_COOKIE } from '../../src/lib/museum-cookie'
import { requireTourFixture, tourFixture } from '../helpers/tour-fixture'

/**
 * The dark-scheme contrast invariants (DESIGN.md → The Follow-the-System
 * Rule), locked as a regression spec for the fixes in PR #13:
 *
 * - the museum-mode chain end to end: cookie → scope → theme. The locked
 *   museum's palette must BE the primary (the original "the theme never
 *   changes" report was seeded data, not code, so this pins the code path);
 * - a primary-colored foreground in dark takes the .4 step, not the filled
 *   step: the museum switch's landmark must read at AA on the dark header.
 *   With the fixture's dark violet the filled step sits at 1.7:1 on the
 *   switch's surface, with the default blue at 3.7:1 — both fail the 4.5:1
 *   assertion;
 * - every focus ring in dark takes the .4 step, reached with the keyboard:
 *   the components-layer rule in globals.css recolors Mantine's own rings
 *   (the switch trigger), and the skip link carries its own attribute-
 *   scoped dark override (its light-dark() form was dropped by the build
 *   pipeline — this spec caught it in CI on the production build). The two
 *   checks agree on the .4 step, so the skip link pins the scheme while the
 *   walk below pins the layer rule on a Mantine control.
 *
 * Needs `pnpm seed:e2e` and a dev server (the config reuses the running
 * one). The seeded brandColor exists only on a freshly created fixture
 * museum: with a fixture from an older seed this spec says how to add it
 * and skips locally, while CI fails — a fresh CI database always has it.
 */
const expect = baseExpect.configure({ timeout: 60_000 })
// Seeded by scripts/seed-tour-navigation.ts (see tests/helpers/tour-fixture.ts).
const fixture = tourFixture
/** The config has no baseURL: pages live on the fixture's server. */
const at = (path: string) => `${new URL(fixture!.url).origin}${path}`
/** The fixture museum's brand color, chosen dark and outside the reserved hues. */
const BRAND = '#4a2d8e'

/** One focused element's ring, as the keyboard renders it in dark. */
async function focusRingOf(page: Page, title: string) {
  // Walking with Tab, not locator.focus(): :focus-visible is what the dark
  // rule targets, and programmatic focus does not always match it.
  for (let step = 0; step < 15; step++) {
    if ((await page.evaluate(() => document.activeElement?.getAttribute('title'))) === title)
      return page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor)
    await page.keyboard.press('Tab')
  }
  throw new Error(`Never reached the "${title}" control with the keyboard.`)
}

test.beforeEach(() => {
  requireTourFixture()
  test.setTimeout(300_000)
})

test('museum mode applies the museum palette and its foreground stays readable in dark', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: MUSEUM_MODE_COOKIE, value: fixture!.museumId, url: at('/') }])
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(at('/en/navigator'), { waitUntil: 'domcontentloaded' })

  const seen = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    // A probe element resolves a CSS variable to the same rgb() form
    // getComputedStyle reports for the values it is compared with.
    const resolve = (value: string) => {
      const probe = document.createElement('span')
      probe.style.color = value
      document.body.appendChild(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    }
    const switchTrigger = Array.from(document.querySelectorAll('button')).find(
      (button) => button.title === 'Change museum',
    )
    const landmark = switchTrigger?.querySelector('svg') ?? null
    const parse = (color: string) => {
      const parts = color.match(/rgba?\(([^)]+)\)/)?.[1].split(',') ?? []
      return parts.slice(0, 3).map((part) => Number.parseFloat(part))
    }
    const luminance = ([r, g, b]: number[]) => {
      const linear = (channel: number) => {
        const value = channel / 255
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
    }
    const ratio = (a: string, b: string) => {
      const first = luminance(parse(a))
      const second = luminance(parse(b))
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    }
    return {
      museumShade: root.getPropertyValue('--mantine-color-museum-6').trim(),
      primaryShade4: resolve('var(--mantine-primary-color-4)'),
      landmarkStroke: landmark ? getComputedStyle(landmark).stroke : null,
      landmarkRatio:
        landmark && switchTrigger
          ? ratio(
              getComputedStyle(landmark).stroke,
              getComputedStyle(switchTrigger).backgroundColor,
            )
          : null,
    }
  })

  // The theme chain: the locked museum's brand color is the primary shade 6.
  // The default blue here means the fixture museum predates the seeded
  // brandColor: an old local seed (fix below) or a broken chain in CI.
  if (seen.museumShade === '#0077d1') {
    const how = `pnpm exec tsx scripts/set-museum-color.ts "[DEV] Tour navigation" "${BRAND}"`
    if (process.env.CI) throw new Error(`The fixture museum has no brandColor. Run: ${how}`)
    test.skip(true, `The fixture museum has no brandColor. Run: ${how}`)
  } else {
    expect(seen.museumShade).toBe(BRAND)
  }

  // The landmark follows the scheme, not the filled step.
  expect(seen.landmarkStroke).toBe(seen.primaryShade4)
  expect(seen.landmarkRatio).toBeGreaterThanOrEqual(4.5)
})

test('dark focus rings and the light scheme keep their shipped colors', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(at('/en/navigator'), { waitUntil: 'domcontentloaded' })

  const shade4 = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--mantine-primary-color-4)'
    document.body.appendChild(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
  // Walk to the skip link instead of assuming the first Tab lands there:
  // in `next dev` the React Query devtools button mounts before it and can
  // steal the first press (CI's production build has none). The ring check
  // then pins the dark scheme (the skip link's own light-dark() and the
  // global rule agree), and the walk below pins the components-layer rule
  // on a Mantine control.
  await expect
    .poll(async () => {
      if (
        (await page.evaluate(() => document.activeElement?.matches('a[href="#main-content"]'))) ===
        true
      )
        return true
      await page.keyboard.press('Tab')
      return false
    })
    .toBe(true)
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor))
    .toBe(shade4)
  await expect.poll(() => focusRingOf(page, 'Change museum')).toBe(shade4)

  // Light keeps the filled step: the dark fix must not move the light scheme.
  await page.emulateMedia({ colorScheme: 'light' })
  // Mantine answers a scheme change through a matchMedia listener, not
  // synchronously: wait for the attribute flip before reading colors.
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.getAttribute('data-mantine-color-scheme')),
    )
    .toBe('light')
  const light = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--mantine-primary-color-filled)'
    document.body.appendChild(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    const landmark = Array.from(document.querySelectorAll('button'))
      .find((button) => button.title === 'Change museum')
      ?.querySelector('svg')
    return { filled: color, landmark: landmark ? getComputedStyle(landmark).stroke : null }
  })
  expect(light.landmark).toBe(light.filled)
})
