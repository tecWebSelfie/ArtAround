import React from 'react'
import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/app-name'
import './globals.css'

import { museumTheme } from '@/lib/museum-theme'
import { AppShell } from '@mantine/core'
import { AppMantineProvider } from '@/components/mantine/AppMantineProvider'

import { AuthProvider } from '@/components/auth/AuthProvider'
import MswProvider from '@/mocks/MswProvider'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'

import { GroupProvider } from '@/components/group/GroupProvider'
import { SiteHeader } from '@/components/navigation/SiteHeader'
import { getSiteChrome } from '@/lib/site-chrome'
import i18nConfig from '@/../i18n.config'
import { getT } from '@/i18n.server'

// Every page names itself in the browser tab ("Bologna Polyptych ·
// Artaround"); pages without a title of their own show the app's name.
export const metadata: Metadata = {
  title: { template: `%s · ${APP_NAME}`, default: APP_NAME },
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
  const chromeRead = getSiteChrome()
  // `t` on its own statement, so `i18next-cli extract` sees its namespace;
  // the reads above were started first and keep loading meanwhile.
  const { t } = await getT()
  const chrome = await chromeRead

  return (
    <MswProvider>
      <AuthProvider>
        {/* Museum mode (cookie `aa-museum`): the locked museum's palette becomes
            the primary color. Rendered here, on the server, so the first
            paint already has the museum's colors; outside museum mode (or for a
            museum without a color) it is the default theme. */}
        <AppMantineProvider theme={museumTheme(chrome.currentMuseum?.palette)}>
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
                {/* Skip link: the first stop for keyboard users, hidden until
                    focused (globals.css → .skip-link). It jumps past the header
                    to the page itself; every page renders inside #main-content. */}
                <a href="#main-content" className="skip-link">
                  {t('Skip to main content')}
                </a>
                <SiteHeader {...chrome} supportedLngs={i18nConfig.supportedLngs} />
                {/* tabIndex -1: the skip link moves focus here, not only the scroll.
                    A div, not <main>: each page renders its own main landmark
                    (AppShellMain, or its root with `component="main"`), and a
                    main here would nest inside theirs. */}
                <div id="main-content" tabIndex={-1} className="outline-none">
                  {children}
                </div>
              </AppShell>
            </ModalsProvider>
          </GroupProvider>
        </AppMantineProvider>
      </AuthProvider>
    </MswProvider>
  )
}
