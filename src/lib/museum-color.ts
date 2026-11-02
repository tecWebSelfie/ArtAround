/**
 * The museum theme's shared constants, dependency-free so the theme
 * (`museum-theme.ts`), the site chrome and the color form can use them without
 * pulling Leonardo and chroma-js (`museum-palette.ts`) into their bundles.
 */

/** Index of the shade Mantine uses for the primary color (`primaryShade`). */
export const PRIMARY_SHADE = 6

/** Shades in a Mantine color tuple, and so in a stored museum `palette`. */
export const PALETTE_SIZE = 10

/** A brand color as the director types it. */
export const HEX = /^#[0-9a-f]{6}$/i

/** A stored palette the theme can use (10 shades); anything else means "no color". */
export const isPalette = (palette: readonly string[] | null | undefined): palette is string[] =>
  palette?.length === PALETTE_SIZE
