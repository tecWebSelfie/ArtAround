'use client'

import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { MuseumSwitch, type MuseumOption } from '@/components/mantine/MuseumSwitch'
import { Anchor, Avatar, Box, Button, Group, Menu, Text } from '@mantine/core'
import { ChevronDown, Landmark, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useT } from 'next-i18next/client'
import {
  MyMuseumsMenuItems,
  NAV_ITEMS,
  useNavState,
  type MyMuseum,
  type NavAccount,
} from './nav-shared'
import { APP_NAME } from '@/lib/app-name'
import { BRAND_GRADIENT } from '@/theme'
import classes from './SiteHeader.module.css'

/**
 * Immersive surfaces own the whole viewport and their own chrome (map
 * navigation header and directions bar, camera scanner, map editor), so the
 * desktop top bar steps aside there. Everything else is a browsing page,
 * including a tour's start page (`…/navigation/tour/[tourId]`, no step yet):
 * the navigation shell shows no map there, only the start actions. The old
 * `/tour/[id]/navigation/…` URLs only redirect (308), so they need no entry.
 */
const IMMERSIVE =
  /^\/[^/]+\/(?:museum\/[^/]+\/navigation(?!\/tour\/[^/]+\/?$)|museum\/[^/]+\/edit\/mapeditor|scan)(?:\/|$)/

/**
 * Desktop top bar (≥ md): on a laptop it replaces the phone's bottom tab bar
 * on every browsing page, with the wordmark, the tab entries (same colors as
 * the bottom bar) and, at the trailing edge, language, museum scope and the
 * account. As in the bottom bar the account links straight to the profile,
 * where the visitor signs out. Below md it is hidden (`visibleFrom`); the
 * phone keeps the tabs layout's top row and bottom bar.
 *
 * It is sticky and publishes its height as `--site-header-height` (globals.css,
 * through `:has(#site-header)`), so sticky panes sit under it, not behind it.
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
  const {
    lng,
    pathname,
    signedIn,
    profileHref,
    displayName,
    inMyMuseum,
    signInHref,
    localize,
    isActive,
  } = useNavState(account, myMuseums)
  // Here, not from `useNavState`: `i18next-cli extract` reads the prefix only at the call.
  const { t } = useT(undefined, { keyPrefix: 'navbar' })

  if (IMMERSIVE.test(pathname)) return null

  return (
    <Box component="header" id="site-header" visibleFrom="md" className={classes.root}>
      <Group h="100%" px="xl" gap="xl" wrap="nowrap" justify="space-between">
        <Group gap="lg" wrap="nowrap">
          {/* The same wordmark as the phone tabs' top row: one spelling
              (APP_NAME) and the brand gradient at every width. */}
          <Anchor
            component={Link}
            href={localize('/navigator')}
            underline="never"
            variant="gradient"
            gradient={BRAND_GRADIENT}
            fw={800}
            fz="xl"
            lh={1}
            className="tracking-[-0.01em]"
          >
            {APP_NAME}
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
          {signedIn && profileHref ? (
            // Straight to the profile, like the bottom bar: signing out lives
            // there (`SignOutButton`). The visible name is the accessible name
            // (WCAG 2.5.3); the avatar's initials are hidden from it.
            <Button
              component={Link}
              href={profileHref}
              variant="subtle"
              leftSection={
                <Avatar size={24} src={signedIn.avatarUrl} name={displayName} aria-hidden />
              }
            >
              <Text span inherit truncate maw="16ch">
                {displayName}
              </Text>
            </Button>
          ) : (
            <Button
              component={Link}
              href={signInHref}
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
