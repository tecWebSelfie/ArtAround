'use client'

import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import type { MuseumRole } from '@/fields/MuseumFunction'
import { Button, Center, Group, Menu, Stack, Text } from '@mantine/core'
import { BadgeCheck, Compass, Landmark, Palette, Store, UserRound } from 'lucide-react'
import type { Route } from 'next'
import { useT } from 'next-i18next/client'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

import i18nConfig from '@/../i18n.config'

const items = [
  {
    Icon: Compass,
    color: 'green',
    label: 'Navigator',
    href: '/navigator',
  },
  {
    Icon: Store,
    color: 'red',
    label: 'Marketplace',
    href: '/marketplace',
  },
] as const

/** A museum where the signed-in visitor holds a per-museum role. */
export type MyMuseum = { id: string; name: string; role: MuseumRole }

// Same icon per role as the profile badges (UserPage): icon + label, never color alone.
const ROLE_META: Record<MuseumRole, { Icon: typeof Landmark; label: string }> = {
  director: { Icon: Landmark, label: 'Director' },
  curator: { Icon: Palette, label: 'Curator' },
  verified: { Icon: BadgeCheck, label: 'Verified creator' },
}

function ItemContent({ Icon, label }: { Icon: typeof Compass; label: string }) {
  return (
    <Center>
      <Stack gap={4} align="center">
        <Icon size={20} />
        <Text size="xs" lh={1}>
          {label}
        </Text>
      </Stack>
    </Center>
  )
}

/**
 * Bottom app navigation. Everything visitor-specific comes from the server
 * session (tabs layout):
 * - `account`: signed-in visitors reach their profile, everyone else signs in
 *   and comes back to the page they were on;
 * - `myMuseums`: a shortcut to the museums where the visitor is director,
 *   curator or verified creator, shown only when there is at least one.
 */
export const NavBar: React.FC<{ account: { id: string } | null; myMuseums: MyMuseum[] }> =
  function ({ account, myMuseums }) {
    const pathname = usePathname()
    const { lng } = useParams()
    const { t } = useT(undefined, { keyPrefix: 'navbar' })
    const accountHref = account
      ? `/${lng}/user/${account.id}`
      : `/${lng}/login?next=${encodeURIComponent(pathname)}`
    const inMyMuseum = myMuseums.some((museum) =>
      pathname.startsWith(`/${lng}/museum/${museum.id}`),
    )

    return (
      <Group grow gap="xs">
        {[
          ...items,
          {
            Icon: UserRound,
            color: 'blue',
            label: account ? 'Account' : 'Sign in',
            href: accountHref.slice(`/${lng}`.length),
          },
        ].map((item) => {
          // Links must be localized (/it/navigator) so the active-state check
          // matches the actual pathname (no redirect hop).
          const href = `/${lng}${item.href}` as Route
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Button
              key={item.href}
              component={Link}
              href={href}
              color={item.color}
              variant={isActive ? 'light' : 'subtle'}
              autoContrast
              aria-current={isActive ? 'page' : undefined}
              h="auto"
              py="sm"
            >
              <ItemContent Icon={item.Icon} label={t(item.label)} />
            </Button>
          )
        })}
        {myMuseums.length > 0 && (
          <Menu position="top" withArrow shadow="md">
            <Menu.Target>
              <Button
                color="grape"
                variant={inMyMuseum ? 'light' : 'subtle'}
                autoContrast
                h="auto"
                py="sm"
              >
                <ItemContent Icon={Landmark} label={t('My museums')} />
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {myMuseums.map((museum) => {
                const { Icon, label } = ROLE_META[museum.role]
                return (
                  <Menu.Item
                    key={museum.id}
                    component={Link}
                    href={`/${lng}/museum/${museum.id}` as Route}
                    leftSection={<Icon size={16} aria-hidden />}
                  >
                    <Stack gap={0}>
                      <Text size="sm">{museum.name}</Text>
                      <Text size="xs" c="dimmed">
                        {t(label)}
                      </Text>
                    </Stack>
                  </Menu.Item>
                )
              })}
            </Menu.Dropdown>
          </Menu>
        )}
        <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
      </Group>
    )
  }
