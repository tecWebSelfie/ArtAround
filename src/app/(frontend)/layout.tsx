import './globals.css'
import React from 'react'

import { MantineProvider, ColorSchemeScript, mantineHtmlProps, AppShell } from '@mantine/core'
import { theme } from '@/theme'

import { IntlProvider } from 'react-intl'

import MswProvider from '@/mocks/MswProvider'

export const metadata = {
  title: 'Artaround',
  description: 'Museum navigation for everybody, everywhere.',
}

//formatJS italian messages
const messagesInItalian = {
  // Add your Italian translations here following https://formatjs.github.io/docs/core-concepts/icu-syntax
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
          <IntlProvider messages={messagesInItalian} locale="it" defaultLocale="it">
            <MantineProvider theme={theme}>
              <AppShell
                footer={{
                  height: 'auto',
                }}
              >
                {children}
              </AppShell>
            </MantineProvider>
          </IntlProvider>
        </MswProvider>
      </body>
    </html>
  )
}
