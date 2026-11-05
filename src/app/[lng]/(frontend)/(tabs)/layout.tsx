import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { MuseumSwitch } from '@/components/mantine/MuseumSwitch'
import i18nConfig from '@/../i18n.config'
import { getSiteChrome } from '@/lib/site-chrome'
import { AppShellFooter, Group, Stack } from '@mantine/core'
import { NavBar } from './NavBar'

/**
 * Tab pages (navigator, marketplace). On phones and tablets they carry their
 * own chrome: a top row with the context controls and the bottom tab bar.
 * From md the desktop top bar (`SiteHeader`, frontend layout) holds the same
 * entries and controls, so both are hidden there.
 */
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const { account, myMuseums, currentMuseum, museums } = await getSiteChrome()

  // Phones and tablets: a column at least one screen tall, so a tab page can
  // fill the height between the top controls and the tab bar (the navigator
  // home fits one screen this way). From md the pages simply flow.
  return (
    <Stack gap={0} className="below-md:min-h-dvh">
      {/* Context controls (language, museum scope) live up here so the bottom
          bar keeps only the tabs and account entries. */}
      <Group
        hiddenFrom="md"
        justify="flex-end"
        gap="xs"
        wrap="nowrap"
        className="px-(--mantine-spacing-md) from-sm:px-(--mantine-spacing-xl)"
        pt="sm"
      >
        <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
        <MuseumSwitch current={currentMuseum} museums={museums} />
      </Group>
      {/* Keyed by the locked museum: switching museum remounts the tab, so
          client components that fetch on their own (the navigator search)
          start over and fetch again within the new scope.
          Below md the tab bar is fixed over the page and these pages aren't in
          `AppShellMain`, so reserve its height (offset + safe area, as Mantine
          sizes the footer) plus a gap: the last row stays reachable. */}
      <Stack
        key={currentMuseum?.id ?? 'all'}
        flex={1}
        pb={{
          base: 'calc(var(--app-shell-footer-offset, 0rem) + env(safe-area-inset-bottom) + var(--mantine-spacing-md))',
          md: 0,
        }}
      >
        {children}
      </Stack>
      <AppShellFooter component="nav" hiddenFrom="md">
        <NavBar account={account} myMuseums={myMuseums} />
      </AppShellFooter>
    </Stack>
  )
}
