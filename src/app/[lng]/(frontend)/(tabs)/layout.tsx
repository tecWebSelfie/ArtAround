import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { MuseumSwitch } from '@/components/mantine/MuseumSwitch'
import i18nConfig from '@/../i18n.config'
import { getSiteChrome } from '@/lib/site-chrome'
import { APP_NAME } from '@/lib/app-name'
import { BRAND_GRADIENT } from '@/theme'
import { AppShellFooter, Group, Stack, Text } from '@mantine/core'
import type { Route } from 'next'
import Link from 'next/link'
import { NavBar } from './NavBar'

/**
 * Tab pages (navigator, marketplace). On phones and tablets they carry their
 * own chrome: a top row with the context controls and the bottom tab bar.
 * From md the desktop top bar (`SiteHeader`, frontend layout) holds the same
 * entries and controls, so both are hidden there.
 */
export default async function TabsLayout({ children, params }: LayoutProps<'/[lng]'>) {
  const [{ lng }, { account, myMuseums, currentMuseum, museums }] = await Promise.all([
    params,
    getSiteChrome(),
  ])

  // Phones and tablets: a column at least one screen tall, so a tab page can
  // fill the height between the top controls and the tab bar. From md the
  // pages simply flow.
  // `--tabs-first-screen` is that height: the screen minus the top row
  // (`--tabs-top-row`, which the row keeps as its height) and the room the
  // tab bar takes (`--tabs-bottom`). A page that scrolls past one screen
  // (the navigator home, with its rails) sizes its first screen with it.
  return (
    <Stack
      gap={0}
      className="below-md:min-h-dvh [--tabs-top-row:3rem] below-md:[--tabs-bottom:calc(var(--app-shell-footer-offset,0rem)+env(safe-area-inset-bottom)+var(--mantine-spacing-md))] [--tabs-first-screen:calc(100dvh-var(--tabs-top-row)-var(--tabs-bottom))]"
    >
      {/* The app's name, then the context controls (language, museum scope):
          up here so the bottom bar keeps only the tabs and account entries.
          The wordmark gives the row (and the marketplace, which has no brand
          title) the app's identity, in its gradient (DESIGN.md → Gradient-Span
          Rule), and links home like the desktop header's. */}
      <Group
        hiddenFrom="md"
        justify="space-between"
        gap="xs"
        wrap="nowrap"
        className="min-h-(--tabs-top-row) px-(--mantine-spacing-md) from-sm:px-(--mantine-spacing-xl)"
        pt="sm"
      >
        <Link
          href={`/${lng}/navigator` as Route}
          className="mantine-focus-auto shrink-0 rounded-sm"
        >
          <Text
            span
            fz="xl"
            fw={800}
            lh={1}
            className="tracking-[-0.01em]"
            variant="gradient"
            gradient={BRAND_GRADIENT}
          >
            {APP_NAME}
          </Text>
        </Link>
        <Group gap="sm" wrap="nowrap" miw={0}>
          <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
          <MuseumSwitch current={currentMuseum} museums={museums} />
        </Group>
      </Group>
      {/* Keyed by the locked museum: switching museum remounts the tab, so
          client components that fetch on their own (the navigator search)
          start over and fetch again within the new scope.
          Below md the tab bar is fixed over the page and these pages aren't in
          `AppShellMain`, so reserve its height (offset + safe area, as Mantine
          sizes the footer) plus a gap: the last row stays reachable
          (`--tabs-bottom`). */}
      <Stack key={currentMuseum?.id ?? 'all'} flex={1} className="below-md:pb-(--tabs-bottom)">
        {children}
      </Stack>
      <AppShellFooter component="nav" hiddenFrom="md">
        <NavBar account={account} myMuseums={myMuseums} />
      </AppShellFooter>
    </Stack>
  )
}
