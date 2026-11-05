import { isPalette, PRIMARY_SHADE } from '@/lib/museum-color'
import { theme as baseTheme } from '@/theme'
import { createTheme, type MantineColorsTuple, type MantineThemeOverride } from '@mantine/core'

/**
 * Mantine theme override for a locked museum. `null` (no museum, or one without
 * a color) keeps the default theme and its blue. Serializable on purpose: the
 * frontend layout is a Server Component and hands this object to the client
 * `MantineProvider`, which writes the CSS variables during server rendering
 * (no flash of the default blue).
 */
export function museumTheme(palette?: readonly string[] | null): MantineThemeOverride {
  if (!isPalette(palette)) return baseTheme
  return createTheme({
    ...baseTheme,
    colors: { museum: palette as unknown as MantineColorsTuple },
    primaryColor: 'museum',
    // Fixed on purpose: the scale guarantees contrast at shade 6, wherever the
    // brand color sits on it.
    primaryShade: PRIMARY_SHADE,
    // Safety net only; the white label on shade 6 already passes AA.
    autoContrast: true,
  })
}
