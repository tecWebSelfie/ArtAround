'use client'

import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { MuseumSwitch, type MuseumOption } from '@/components/mantine/MuseumSwitch'
import { Anchor, Avatar, Box, Button, Group, Menu, Text } from '@mantine/core'
import { ChevronDown, Landmark, LogIn } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AccountMenuItems,
  MyMuseumsMenuItems,
  NAV_ITEMS,
  useNavState,
  type MyMuseum,
  type NavAccount,
} from './nav-shared'
import classes from './SiteHeader.module.css'

/**
 * Immersive surfaces own the whole viewport and their own chrome (map
 * navigation header and directions bar, camera scanner, map editor), so the
 * desktop top bar steps aside there. Everything else is a browsing page.
 */
const IMMERSIVE =
  /^\/[^/]+\/(?:tour\/[^/]+\/navigation\/[^/]+|museum\/[^/]+\/navigation|museum\/[^/]+\/edit\/mapeditor|scan)(?:\/|$)/

/**
 * Desktop top bar (≥ md). On a laptop the visitor browses, plans and reads
 * rather than walking with a phone, so the phone's bottom tab bar gives way
 * to one persistent bar on every browsing page: the wordmark, the tab entries
 * as horizontal links (same colors as the bottom bar), and at the trailing
 * edge the context controls (language, museum scope) and the account, whose
 * menus open downward. Below md it renders nothing visible (`visibleFrom`);
 * the phone keeps the tabs layout's top row and bottom bar.
 *
 * It is sticky and exposes its height as `--site-header-height` (globals.css,
 * through `:has(#site-header)`), so sticky panes and in-page headers can sit
 * under it instead of behind it.
 */
export function SiteHeader({
  account,
  myMuseums,
  currentMuseum,
  museums,
  supportedLngs,
}: {
  account: NavAccount | null
  myMuseums: MyMuseum[]
  currentMuseum: { id: string; name: string } | null
  museums: MuseumOption[]
  supportedLngs: string[]
}) {
  const pathname = usePathname()
  const { t, lng, signedIn, displayName, inMyMuseum, signInHref, localize, isActive, handleLogout } =
    useNavState(account, myMuseums)

  if (IMMERSIVE.test(pathname)) return null

  return (
    <Box component="header" id="site-header" visibleFrom="md" className={classes.root}>
      <Group h="100%" px="xl" gap="xl" wrap="nowrap" justify="space-between">
        <Group gap="lg" wrap="nowrap">
          <Anchor
            component={Link}
            href={localize('/navigator')}
            underline="never"
            c="var(--mantine-color-text)"
            fw={700}
            fz="lg"
          >
            ArtAround
          </Anchor>
          <Group component="nav" aria-label={t('Main navigation')} gap={4} wrap="nowrap">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={localize(item.href)}
                  color={item.color}
                  variant={active ? 'light' : 'subtle'}
                  autoContrast
                  aria-current={active ? 'page' : undefined}
                  leftSection={<item.Icon size={16} aria-hidden />}
                >
                  {t(item.label)}
                </Button>
              )
            })}
            {myMuseums.length > 0 && (
              <Menu position="bottom-start" withArrow shadow="md">
                <Menu.Target>
                  <Button
                    color="grape"
                    variant={inMyMuseum ? 'light' : 'subtle'}
                    autoContrast
                    leftSection={<Landmark size={16} aria-hidden />}
                    rightSection={<ChevronDown size={14} aria-hidden />}
                  >
                    {t('My museums')}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <MyMuseumsMenuItems lng={lng} myMuseums={myMuseums} />
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
        <Group gap="xs" wrap="nowrap" miw={0}>
          <LanguageSwitcher supportedLngs={supportedLngs} />
          <Box maw={220} miw={0}>
            <MuseumSwitch current={currentMuseum} museums={museums} />
          </Box>
          {signedIn ? (
            <Menu position="bottom-end" width={200} shadow="md">
              <Menu.Target>
                {/* The visible name is the accessible name (WCAG 2.5.3); the
                    avatar's initials are hidden from it. */}
                <Button
                  variant="subtle"
                  leftSection={
                    <Avatar size={24} src={signedIn.avatarUrl} name={displayName} aria-hidden />
                  }
                  rightSection={<ChevronDown size={14} aria-hidden />}
                >
                  <Text span inherit truncate maw="16ch">
                    {displayName}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <AccountMenuItems
                  lng={lng}
                  accountId={signedIn.id}
                  onLogout={() => void handleLogout()}
                />
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Button
              component={Link}
              href={signInHref as Route}
              variant="default"
              leftSection={<LogIn size={16} aria-hidden />}
            >
              {t('SignIn')}
            </Button>
          )}
        </Group>
      </Group>
    </Box>
  )
}
