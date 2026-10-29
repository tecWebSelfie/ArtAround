import { createTheme, type MantineGradient } from '@mantine/core'

export const theme = createTheme({})

/**
 * The tour identity (DESIGN.md → Colors): grape into orange on every tour
 * mark drawn with Mantine's `gradient` variant (start buttons, tour pills,
 * the search result's tour icon, the deck's "Tours" label).
 */
export const TOUR_GRADIENT = { from: 'grape', to: 'orange' } satisfies MantineGradient
