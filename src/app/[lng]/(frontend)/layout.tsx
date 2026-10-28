import React from 'react'
import './globals.css'

import { theme } from '@/theme'
import { AppShell, MantineProvider } from '@mantine/core'

import { AuthProvider } from '@/components/auth/AuthProvider'
import MswProvider from '@/mocks/MswProvider'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'

import { GroupProvider } from '@/components/group/GroupProvider'
import { SiteHeader } from '@/components/navigation/SiteHeader'
import { getSiteChrome } from '@/lib/site-chrome'
import i18nConfig from '@/../i18n.config'

export const metadata = {
  title: 'Artaround',
  description: 'Museum navigation for everybody, everywhere.',
}

// NOTE: this is a nested layout — the document (`<html>`/`<head>`/`<body>`,
// ColorSchemeScript, mantineHtmlProps) lives in the root `app/[lng]/layout.tsx`.
// Rendering a second `<html>` here produced nested html elements and a React
// hydration mismatch (`data-mantine-color-scheme`).
export default async function Layout(props: { children: React.ReactNode }) {
  const { children } = props
  // The desktop top bar's account, museums and museum scope (shared, cached
  // with the tabs layout's bottom bar for the same request).
  const chrome = await getSiteChrome()

  return (
    <MswProvider>
      <AuthProvider>
        <MantineProvider theme={theme}>
          <Notifications />
          {/* Group tours: one LiveKit room kept across every page (GroupProvider). */}
          <GroupProvider>
            <ModalsProvider>
              <AppShell
                footer={{
                  height: 64,
                  offset: true,
                }}
                header={{
                  height: 'auto',
                  offset: false,
                }}
              >
                {/* Desktop only (≥ md), and not on immersive map/scan/editor
                    surfaces: see SiteHeader. In the flow (sticky), so pages
                    start below it without an AppShell header offset. */}
                <SiteHeader {...chrome} supportedLngs={i18nConfig.supportedLngs} />
                {children}
              </AppShell>
            </ModalsProvider>
          </GroupProvider>
        </MantineProvider>
      </AuthProvider>
    </MswProvider>
  )
}
