'use client'

import { cssVariablesResolver } from '@/theme'
import { MantineProvider, type MantineProviderProps } from '@mantine/core'

/**
 * The app's MantineProvider with its CSS variables resolver (readable
 * `dimmed`, see `src/theme.ts`). A client component because the resolver is a
 * function, which a server layout can't pass across to a client component;
 * the theme itself is plain data and still comes from the server
 * (`museumTheme`, so museum mode paints its colors on the first render).
 */
export function AppMantineProvider(props: Omit<MantineProviderProps, 'cssVariablesResolver'>) {
  return <MantineProvider {...props} cssVariablesResolver={cssVariablesResolver} />
}
