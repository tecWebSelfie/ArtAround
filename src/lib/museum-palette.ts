import { BackgroundColor, Color, Theme } from '@adobe/leonardo-contrast-colors'
import chroma from 'chroma-js'
import { HEX, PRIMARY_SHADE } from '@/lib/museum-color'

/**
 * Per-museum theme: the museum director picks ONE brand color (`brandColor`,
 * a hex) and this module turns it into the 10-shade scale Mantine themes with
 * (`palette`, stored on the museum). The visitor who locks the app to that
 * museum (`MuseumSwitch`, cookie `aa-museum`) then gets it as the primary
 * color: buttons, links, active tab, selection and focus ring. Semantic colors
 * (tours, contents, paid, difficulty, markers, destructive) never change; see
 * DESIGN.md → The Museum Primary Rule.
 *
 * Contrast is the reason a derived scale exists. Mantine reads the primary at
 * shade 6 for filled buttons (white text), outline, links and the focus ring,
 * and shade 9 as text of the `light` variant, so what matters is the contrast
 * of those shades, not of the color the director typed. A scale from
 * `generateColors` (Mantine) gives no such guarantee: a yellow brand lands at
 * 1.9:1 on white. Leonardo builds each shade for a target contrast ratio.
 *
 * Pure and deterministic, and free of Mantine/React so the Payload config can
 * import it: runs on the server when a museum is saved (the `beforeChange` hook
 * in `collections/Museums.ts`) and in the director's preview; visitors only
 * receive the finished hexes. The Mantine side is `museum-theme.ts`.
 */

/** Target contrast ratios on white for shades 0…9 (shade 6 clears WCAG AA text). */
const RATIOS = [1.07, 1.2, 1.4, 1.75, 2.3, 3.2, 4.6, 5.8, 7.5, 10]

/** WCAG AA for normal text, and for the white label on a filled button. */
export const AA = 4.5

const WHITE = '#ffffff'

export const contrastOnWhite = (hex: string) => chroma.contrast(hex, WHITE)

export type MuseumPalette = {
  /** The 10 shades, light to dark, as lowercase `#rrggbb`. */
  palette: string[]
  /** True when the brand color was darkened to be readable on white. */
  adjusted: boolean
}

/**
 * The scale for a brand color.
 *
 * - The brand color already clears AA on white: it is used as is, as shade 6.
 *   A dark navy stays navy. Leonardo would otherwise pull it up to the target
 *   ratio and lighten it.
 * - Otherwise (yellow, cyan, light green, pastels): shade 6 is the color of the
 *   same family that reaches the target ratio, and `adjusted` tells the form to
 *   say so.
 *
 * Shades 7–9 always stay darker than shade 6 (hover, text of the light variant)
 * and shade 1 stays visibly tinted but light enough for dark text.
 */
export function museumPalette(brand: string): MuseumPalette {
  if (!HEX.test(brand)) throw new Error(`Not a #rrggbb color: ${brand}`)
  const hex = brand.toLowerCase()
  const ratio = contrastOnWhite(hex)
  const exact = ratio >= AA

  const ratios = [...RATIOS]
  if (exact) {
    // Shade 6 is the brand color itself; the darker shades are spread between
    // it and a floor close to black so they stay ordered at any starting point.
    ratios[PRIMARY_SHADE] = ratio
    const top = Math.max(RATIOS[9], ratio + (21 - ratio) * 0.5)
    for (let i = PRIMARY_SHADE + 1; i < RATIOS.length; i++) {
      const t = (RATIOS[i] - RATIOS[PRIMARY_SHADE]) / (RATIOS[9] - RATIOS[PRIMARY_SHADE])
      ratios[i] = ratio + t * (top - ratio)
    }
  }

  const color = new Color({
    name: 'museum',
    colorKeys: [hex as `#${string}`],
    // Leonardo is pinned to 1.0.1, whose option is still `colorspace`: 1.1.0
    // renamed it to `colorSpace` but also ships an ambient `chroma-js`
    // declaration that hides @types/chroma-js from the whole project.
    ratios,
    colorspace: 'OKLCH',
  })
  const background = new BackgroundColor({ name: 'white', colorKeys: [WHITE], ratios: [1] })
  const generated = new Theme({ colors: [color], backgroundColor: background, lightness: 100 })
  const values = generated.contrastColors[1]
  if (!('values' in values)) throw new Error('Leonardo returned no scale')
  const palette = values.values.map((entry) => String(entry.value).toLowerCase())
  if (exact) palette[PRIMARY_SHADE] = hex

  return { palette, adjusted: !exact }
}

/**
 * The app's meaning colors (DESIGN.md → Colors), as the Mantine shades the UI
 * draws them with. Hue windows are measured around these, so a change of the
 * semantic color moves its window too.
 */
const MEANING = {
  // red.6: actions that delete something (and feedback-wrong).
  destructive: '#fa5252',
  // orange.6: paid contents (paid orange).
  paid: '#fd7e14',
  // grape.6, content teal and Navigator green.
  tour: '#be4bdb',
  content: '#12b886',
  navigator: '#40c057',
} as const

type Meaning = keyof typeof MEANING

const hueOf = (hex: string) => chroma(hex).oklch()[2]
const MEANING_HUES = Object.fromEntries(
  Object.entries(MEANING).map(([name, hex]) => [name, hueOf(hex)]),
) as Record<Meaning, number>

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

/**
 * The meaning color among `names` whose hue is closest to `hex`, if within
 * `tolerance` degrees and `hex` is saturated enough to read as that color.
 */
function closestMeaning<N extends Meaning>(
  hex: string,
  names: readonly N[],
  tolerance: number,
  minChroma: number,
): N | null {
  const [, c, h] = chroma(hex).oklch()
  if (Number.isNaN(h) || c < minChroma) return null
  let best: N | null = null
  for (const name of names) {
    const distance = hueDistance(h, MEANING_HUES[name])
    if (distance <= tolerance && (!best || distance < hueDistance(h, MEANING_HUES[best]))) {
      best = name
    }
  }
  return best
}

/**
 * Brand colors the app cannot give to its buttons, because the hue already
 * carries a meaning on every page: red marks the actions that delete
 * something, orange marks paid contents. A saturated red or orange primary
 * would make every "Save" look destructive or every "Explore" look like a
 * purchase. Dark, muted reds (bordeaux) stay allowed: they read as wine, not as
 * an alarm.
 */
const RESERVED = ['destructive', 'paid'] as const
const RESERVED_MIN_CHROMA = 0.15

export type ReservedHue = (typeof RESERVED)[number]

export const reservedHue = (hex: string): ReservedHue | null =>
  closestMeaning(hex, RESERVED, 15, RESERVED_MIN_CHROMA)

/**
 * Closest color outside the reserved hues: same lightness and hue, chroma
 * lowered until it reads as brick or wine instead of alarm red. Offered next to
 * the "not allowed" message so the director has somewhere to go.
 */
export function nearestAllowed(hex: string): string {
  const [l, , h] = chroma(hex).oklch()
  return chroma.oklch(l, RESERVED_MIN_CHROMA - 0.005, h).hex()
}

/** Section colors the brand could be mistaken for: a warning, not a block. */
const SIMILAR = ['tour', 'content', 'navigator'] as const

export type SimilarHue = (typeof SIMILAR)[number]

export const similarHue = (hex: string): SimilarHue | null => closestMeaning(hex, SIMILAR, 22, 0.1)
