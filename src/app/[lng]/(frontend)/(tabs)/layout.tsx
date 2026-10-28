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

  return (
    <>
      {/* Context controls (language, museum scope) live up here so the bottom
          bar keeps only the tabs and account entries. */}
      <Group
        hiddenFrom="md"
        justify="flex-end"
        gap="xs"
        wrap="nowrap"
        px={{ base: 'md', sm: 'xl' }}
        pt="sm"
      >
        <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
        <MuseumSwitch current={currentMuseum} museums={museums} />
      </Group>
      <Stack>{children}</Stack>
      <AppShellFooter component="nav" hiddenFrom="md">
        <NavBar account={account} myMuseums={myMuseums} />
      </AppShellFooter>
    </>
  )
}
