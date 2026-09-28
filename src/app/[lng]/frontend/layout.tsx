import './globals.css'
import React from 'react'

import { MantineProvider, ColorSchemeScript, mantineHtmlProps, AppShell } from '@mantine/core'
import { theme } from '@/theme'

import MswProvider from '@/mocks/MswProvider'

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
        <MswProvider>
          <MantineProvider theme={theme}>
            <AppShell
              footer={{
                height: 'auto',
              }}
            >
              {children}
            </AppShell>
          </MantineProvider>
        </MswProvider>
      </body>
    </html>
  )
}
