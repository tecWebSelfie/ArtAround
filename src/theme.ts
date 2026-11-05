import { createTheme, DEFAULT_THEME, type MantineGradient } from '@mantine/core'

/**
 * `respectReducedMotion`: Mantine marks the app with
 * `data-respect-reduced-motion`, which turns off its own transitions and the
 * looping `BorderAnimate` rings (tour carousel, search, start button) for
 * visitors who ask the OS for reduced motion.
 */
export const theme = createTheme({
  respectReducedMotion: true,
  // The primary color is called `museum` (DESIGN.md → The Museum Primary Rule):
  // by default it is Mantine's blue, so the app looks as it always did, and
  // `museumTheme()` swaps in the palette of the museum the visitor is locked
  // to. Components that mean "the common action" use `museum` (or no color at
  // all, which is the primary); `blue` itself stays a plain blue for the few
  // places where blue carries its own meaning (markers, accessibility).
  colors: { museum: DEFAULT_THEME.colors.blue },
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
 * the search result's tour icon, the deck's "Tours" label).
 */
export const TOUR_GRADIENT = { from: 'grape', to: 'orange' } satisfies MantineGradient
