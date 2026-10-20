import React from 'react'
import './globals.css'

import { theme } from '@/theme'
import { AppShell, MantineProvider } from '@mantine/core'

import { AuthProvider } from '@/components/auth/AuthProvider'
import MswProvider from '@/mocks/MswProvider'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'

import { GroupProvider } from '@/components/group/GroupProvider'
import { AgentProvider } from './AgentProvider'

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

  return (
    <MswProvider>
      <AuthProvider>
        <AgentProvider>
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
                  {children}
                </AppShell>
              </ModalsProvider>
            </GroupProvider>
          </MantineProvider>
        </AgentProvider>
      </AuthProvider>
    </MswProvider>
  )
}
