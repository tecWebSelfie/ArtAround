import '../../(frontend)/globals.css'
import React from 'react'

import {
  DEFAULT_THEME,
  colorsTuple,
  createTheme,
  MantineProvider,
  ColorSchemeScript,
  mantineHtmlProps,
} from '@mantine/core'
import { theme } from '@/theme'

const playgroundTheme = createTheme({
  ...theme,
  colors: {},
})
export const metadata = {
  title: 'Artaround',
  description: 'Museum navigation for everybody, everywhere.',
}

export default async function Layout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={playgroundTheme}>{children}</MantineProvider>
      </body>
    </html>
  )
}
