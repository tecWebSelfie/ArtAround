import React from 'react'
import './styles.css'
import { Metadata } from 'next'

import '@mantine/core/styles.css'

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { theme } from '@/theme'

import { IntlProvider } from 'react-intl'

import MswProvider from '@/mocks/MswProvider'

export const metadata: Metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

//formatJS italian messages
const messagesInItalian = {
  // Add your Italian translations here following https://formatjs.github.io/docs/core-concepts/icu-syntax
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MswProvider>
          <IntlProvider messages={messagesInItalian} locale="it" defaultLocale="it">
            <MantineProvider theme={theme}>{children}</MantineProvider>
          </IntlProvider>
        </MswProvider>
      </body>
    </html>
  )
}
