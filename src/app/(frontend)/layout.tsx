import React from 'react'
import './styles.css'
import { Metadata } from 'next'

import '@mantine/core/styles.css'

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core'
import { theme } from '@/theme'

export const metadata: Metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  )
}
