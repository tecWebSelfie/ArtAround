import { createTheme, type MantineGradient } from '@mantine/core'

/**
 * `respectReducedMotion`: Mantine marks the app with
 * `data-respect-reduced-motion`, which turns off its own transitions and the
 * looping `BorderAnimate` rings (tour carousel, search, start button) for
 * visitors who ask the OS for reduced motion.
 */
export const theme = createTheme({ respectReducedMotion: true })

/**
 * The tour identity (DESIGN.md → Colors): grape into orange on every tour
 * mark drawn with Mantine's `gradient` variant (start buttons, tour pills,
 * the search result's tour icon, the deck's "Tours" label).
 */
export const TOUR_GRADIENT = { from: 'grape', to: 'orange' } satisfies MantineGradient
