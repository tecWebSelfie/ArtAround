import {
  createTheme,
  type CSSVariablesResolver,
  darken,
  luminance,
  type MantineColorsTuple,
  type MantineGradient,
} from '@mantine/core'

/**
 * The default primary: Mantine's blue run through `museumPalette`
 * (src/lib/museum-palette.ts) and frozen here, so the theme doesn't ship
 * Leonardo to the browser. Mantine's own blue.6 carries a white label at
 * 3.6:1; this scale keeps the hue but puts shade 6 at 4.6:1 (WCAG AA), the
 * same guarantee every museum palette gives. `museum-palette.int.spec.ts`
 * checks it still matches `museumPalette('#228be6')`.
 */
export const DEFAULT_PRIMARY: MantineColorsTuple = [
  '#f1f7fe',
  '#ddecfd',
  '#c0dcfa',
  '#9dc8f6',
  '#71aff0',
  '#3993e8',
  '#0077d1',
  '#0065bd',
  '#0053a9',
  '#003d92',
]

/**
 * `respectReducedMotion`: Mantine marks the app with
 * `data-respect-reduced-motion`, which turns off its own transitions and the
 * looping `BorderAnimate` rings (tour carousel, search, start button) for
 * visitors who ask the OS for reduced motion.
 */
export const theme = createTheme({
  respectReducedMotion: true,
  // The primary color is called `museum` (DESIGN.md → The Museum Primary Rule):
  // by default it is Mantine's blue made AA (`DEFAULT_PRIMARY`), and
  // `museumTheme()` swaps in the palette of the museum the visitor is locked
  // to. Components that mean "the common action" use `museum` (or no color at
  // all, which is the primary); `blue` itself stays a plain blue for the few
  // places where blue carries its own meaning (markers, accessibility).
  colors: { museum: DEFAULT_PRIMARY },
  primaryColor: 'museum',
})

/**
 * Accessibility (DESIGN.md → The Museum Primary Rule): the blue of the
 * international accessibility symbol, on everything that says "accessible" or
 * "wheelchair": the museum's accessibility badge and features, the tour's
 * step-free badge, the wheelchair-route toggle on the map. A fixed meaning, so
 * it never follows the museum's color.
 */
export const ACCESSIBILITY_COLOR = 'blue'

/**
 * The tour identity (DESIGN.md → Colors): grape into orange on every tour
 * mark drawn with Mantine's `gradient` variant (start buttons, tour pills,
 * the search result's tour icon, the deck's "Tours" label). Deep shades: the
 * white label sits mid-gradient, where grape.8 → orange.9 reads at about 5:1
 * (grape.6 → orange.6 gave 3.2:1).
 */
export const TOUR_GRADIENT = { from: 'grape.8', to: 'orange.9' } satisfies MantineGradient

const AA = 4.5

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Text color for a palette's `light` variant (badges, light buttons, alerts,
 * `subtle` buttons): Mantine colors that text with a mid shade, which on the
 * pale tint reads at 1.8:1 for yellow and under 4.5:1 for most hues, so
 * "Medium" or "Easy" badges were hard to read. This picks the first of shades
 * 6–9 that reaches AA on shade 1 (the darkest of the pale backgrounds that
 * text sits on: the light tint, its hover and shade-1 fills such as the
 * timeline's quiz bullet), and darkens shade 9 further for the hues where none
 * does (yellow, lime, orange). The hue stays; only the lightness moves.
 */
export function lightVariantText(shades: readonly string[]): string {
  const tint = shades[1]
  const shade = shades.slice(6).find((color) => contrast(color, tint) >= AA)
  if (shade) return shade
  let color = shades[9]
  for (let step = 0; step < 10 && contrast(color, tint) < AA; step++) color = darken(color, 0.1)
  return color
}

const lightTextCache = new Map<string, string>()

/**
 * Light-scheme CSS variables:
 *
 * - Readable supporting text (DESIGN.md → Dimmed text): Mantine's light
 *   `dimmed` is gray.6, 3.3:1 on white, below WCAG AA for the help,
 *   descriptions and captions it colors. gray.7 (about 8:1) keeps it a step
 *   quieter than body text while passing AA.
 * - Readable placeholders: Mantine's gray.5 is 2.1:1 on a white field, and
 *   placeholders here carry real hints ("Search tours, museums, cities", the
 *   group code example). No stock step sits between gray.6 (3.3:1) and gray.7
 *   (8:1, reads as typed text), so a mix of the two reaches about 4.7:1 while
 *   still looking like a hint.
 * - `--mantine-color-<c>-light-color` for every palette, museum palettes
 *   included: see `lightVariantText`. One variable per color, so every
 *   component's light, subtle and transparent variants follow without
 *   per-call `color="x.8"` patches.
 *
 * Dark keeps Mantine's own values except two text tones that fall short on
 * the dark page: `dimmed` (dark.2, about 4:1, 4.4:1 on a card) becomes a
 * dark.2/dark.1 mix (about 4.8:1 on a card, 5.5:1 on the page), and the
 * placeholder (dark.3, about 2.5:1 on a dark field) a dark.2/dark.1 mix
 * (about 4.6:1). The app follows the system scheme, so dark is a
 * first-class scheme, not a fallback.
 * Pass it to every MantineProvider that renders app UI.
 */
export const cssVariablesResolver: CSSVariablesResolver = (theme) => {
  const light: Record<string, string> = {
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
    '--mantine-color-placeholder':
      'color-mix(in srgb, var(--mantine-color-gray-6), var(--mantine-color-gray-7) 40%)',
  }
  for (const [name, shades] of Object.entries(theme.colors)) {
    const key = shades.join()
    let text = lightTextCache.get(key)
    if (!text) {
      text = lightVariantText(shades)
      lightTextCache.set(key, text)
    }
    light[`--mantine-color-${name}-light-color`] = text
  }
  const dark = {
    '--mantine-color-dimmed':
      'color-mix(in srgb, var(--mantine-color-dark-2), var(--mantine-color-dark-1) 45%)',
    '--mantine-color-placeholder':
      'color-mix(in srgb, var(--mantine-color-dark-2), var(--mantine-color-dark-1) 40%)',
  }
  return { variables: {}, light, dark }
}
