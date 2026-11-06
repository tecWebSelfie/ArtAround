import chroma from 'chroma-js'
import { describe, expect, it } from 'vitest'
import {
  AA,
  contrastOnWhite,
  museumPalette,
  nearestAllowed,
  reservedHue,
  similarHue,
} from '@/lib/museum-palette'
import { PRIMARY_SHADE } from '@/lib/museum-color'

// The per-museum theme (src/lib/museum-palette.ts): whatever color a director
// types, the derived scale has to keep the contrast Mantine's primary roles
// rely on (shade 6: filled button with white label, link, outline, focus ring;
// shade 9: text of the light variant on shades 1 and 2).

/** A grid over hue, lightness and chroma, plus greys and the extremes. */
const samples: string[] = [
  '#ffffff',
  '#000000',
  '#808080',
  '#fab005', // yellow
  '#15aabf', // cyan
  '#94d82d', // light green
  '#a5d8ff', // pastel blue
  '#1b2a4a', // navy
  '#228be6', // Mantine blue
  '#7b1113', // bordeaux
  '#2b8a3e',
  '#862e9c',
]
for (let hue = 0; hue < 360; hue += 30) {
  for (const l of [0.25, 0.5, 0.75, 0.92]) {
    for (const c of [0.04, 0.12, 0.2]) samples.push(chroma.oklch(l, c, hue).hex())
  }
}

const ratio = (a: string, b: string) => chroma.contrast(a, b)

// Each palette costs a few ms (Leonardo solves the contrast curve): derive the
// grid's palettes once and share them across the checks below, instead of
// recomputing ~150 of them per test (that alone was ~4 s of the int suite).
const samplePalettes = samples.map((hex) => ({ hex, palette: museumPalette(hex).palette }))

describe('museumPalette', () => {
  it('returns ten lowercase hex shades, light to dark', () => {
    for (const { hex, palette } of samplePalettes) {
      expect(palette).toHaveLength(10)
      for (const shade of palette) expect(shade).toMatch(/^#[0-9a-f]{6}$/)
      // Shade 0 → 9 only gets darker (never lighter).
      for (let i = 1; i < 10; i++) {
        expect(chroma(palette[i]).luminance(), `${hex} shade ${i}`).toBeLessThanOrEqual(
          chroma(palette[i - 1]).luminance() + 1e-6,
        )
      }
    }
  })

  it('keeps shade 6 readable on white for any brand color (buttons, links, focus)', () => {
    for (const { hex, palette } of samplePalettes) {
      expect(contrastOnWhite(palette[PRIMARY_SHADE]), hex).toBeGreaterThanOrEqual(AA - 0.05)
    }
  })

  it('keeps the light variant readable: shade 9 on shades 1 and 2, shade 1 apart from white', () => {
    for (const { hex, palette } of samplePalettes) {
      expect(ratio(palette[9], palette[1]), `${hex} 9 on 1`).toBeGreaterThanOrEqual(AA)
      expect(ratio(palette[9], palette[2]), `${hex} 9 on 2`).toBeGreaterThanOrEqual(AA)
      expect(contrastOnWhite(palette[1]), `${hex} shade 1`).toBeGreaterThan(1.02)
    }
  })

  it('makes the hover shade (7) visibly different from shade 6 unless already near black', () => {
    for (const { hex, palette } of samplePalettes) {
      if (contrastOnWhite(palette[PRIMARY_SHADE]) > 15) continue
      expect(ratio(palette[7], palette[6]), hex).toBeGreaterThan(1.03)
    }
  })

  it('uses the brand color as is when it already clears AA', () => {
    const navy = museumPalette('#1b2a4a')
    expect(navy.adjusted).toBe(false)
    expect(navy.palette[PRIMARY_SHADE]).toBe('#1b2a4a')

    const blue = museumPalette('#1c7ed6')
    // Mantine blue.7 is ~4.1:1, so it must be corrected; a darker one must not.
    expect(museumPalette('#1864ab').adjusted).toBe(false)
    expect(blue.adjusted).toBe(contrastOnWhite('#1c7ed6') < AA)
  })

  it('darkens colors that are too light, keeping the family', () => {
    for (const hex of ['#fab005', '#15aabf', '#94d82d', '#a5d8ff']) {
      const result = museumPalette(hex)
      expect(result.adjusted, hex).toBe(true)
      expect(contrastOnWhite(result.palette[PRIMARY_SHADE])).toBeGreaterThanOrEqual(AA - 0.05)
      // Hue stays close (a readable yellow is an ochre, so allow some drift).
      const drift = Math.abs(
        chroma(hex).oklch()[2] - chroma(result.palette[PRIMARY_SHADE]).oklch()[2],
      )
      expect(Math.min(drift, 360 - drift), hex).toBeLessThan(25)
    }
  })

  it('rejects anything that is not #rrggbb', () => {
    expect(() => museumPalette('red')).toThrow()
    expect(() => museumPalette('#fff')).toThrow()
  })
})

describe('reserved and similar hues', () => {
  it('blocks saturated red and orange, which already mean "delete" and "paid"', () => {
    expect(reservedHue('#e03131')).toBe('destructive')
    expect(reservedHue('#fa5252')).toBe('destructive')
    expect(reservedHue('#fd7e14')).toBe('paid')
    expect(reservedHue('#f76707')).toBe('paid')
  })

  it('lets other brands through, including muted reds and yellow', () => {
    for (const hex of [
      '#7b1113',
      '#fab005',
      '#228be6',
      '#2b8a3e',
      '#862e9c',
      '#1b2a4a',
      '#808080',
    ]) {
      expect(reservedHue(hex), hex).toBeNull()
    }
  })

  it('offers an alternative that is no longer reserved', () => {
    for (const hex of ['#e03131', '#fd7e14', '#c92a2a']) {
      expect(reservedHue(nearestAllowed(hex)), hex).toBeNull()
    }
  })

  it('warns about the section colors only', () => {
    expect(similarHue('#be4bdb')).toBe('tour')
    expect(similarHue('#12b886')).toBe('content')
    expect(similarHue('#40c057')).toBe('navigator')
    expect(similarHue('#228be6')).toBeNull()
    expect(similarHue('#808080')).toBeNull()
  })
})
