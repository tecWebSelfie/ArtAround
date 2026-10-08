'use client'

import { ColorSchemeScript } from '@mantine/core'

type Props = React.ComponentProps<typeof ColorSchemeScript>

/**
 * Wrapper server-safe di Mantine ColorSchemeScript.
 *
 * Perché esiste: ColorSchemeScript è un Client Component che renderizza un
 * <script> anti-flash (setta data-mantine-color-scheme prima del paint).
 * React 19 / Next 16 rifiuta gli <script> renderizzati sul client:
 * "Scripts inside React components are never executed when rendering on the client".
 *
 * Lo script serve solo al primo load (gira prima dell'hydration), quindi qui
 * lo renderizziamo solo sul server e ritorniamo null sul client — stessa
 * strategia del fix ufficiale di next-themes. Nessun flash, nessun errore.
 */
export function MantineColorSchemeScript(props: Props) {
  if (typeof window !== 'undefined') {
    return null
  }
  return <ColorSchemeScript suppressHydrationWarning {...props} />
}
