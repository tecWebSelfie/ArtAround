'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import type { MuseumRole } from '@/fields/MuseumFunction'
import { Avatar, Button, Center, Group, Menu, Stack, Text } from '@mantine/core'
import { BadgeCheck, Compass, Landmark, LogIn, Palette, Store } from 'lucide-react'
import type { Route } from 'next'
import { useT } from 'next-i18next/client'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

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

/** The signed-in visitor as the server session sees it (tabs layout). */
export type NavAccount = { id: string; name?: string | null; avatarUrl?: string | null }

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
 * Bottom app navigation.
 * - Account entry: the client session (`AuthProvider`) drives the avatar link
 *   to the visitor's profile (where they sign out), so it reacts to
 *   sign-in/out without a reload. While its
 *   first `/api/users/me` probe runs, the server session (`account`, from the
 *   tabs layout, with name and avatar) answers instead, so the entry renders
 *   the real visitor at once instead of a spinner or a placeholder name.
 *   Signed-out visitors sign in and come back to the page they were on (`?next=`).
 * - `myMuseums`: a shortcut to the museums where the visitor is director,
 *   curator or verified creator, shown only when there is at least one.
 */
export const NavBar: React.FC<{ account: NavAccount | null; myMuseums: MyMuseum[] }> = function ({
  account,
  myMuseums,
}) {
  const pathname = usePathname()
  const { lng } = useParams()
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  const { status, user } = useAuth()

  const signedIn: NavAccount | null =
    status === 'loading'
      ? account
      : user
        ? {
            id: String(user.id),
            name: user.name?.fullName || user.username,
            avatarUrl: typeof user.avatar === 'object' ? user.avatar?.url : null,
          }
        : null
  const displayName = signedIn?.name || t('Account')
  const inMyMuseum = myMuseums.some((museum) => pathname.startsWith(`/${lng}/museum/${museum.id}`))

  // Tight horizontal padding (px={4}) on every entry: with four entries a
  // phone leaves ~90px each, enough for "Marketplace" only without the
  // default button padding.
  return (
    <Group grow gap={4}>
      {items.map((item) => {
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
            px={4}
          >
            <ItemContent Icon={item.Icon} label={t(item.label)} />
          </Button>
        )
      })}
      {signedIn ? (
        // Straight to the profile: signing out lives there (`SignOutButton`,
        // shown on the viewer's own profile), so no menu stands in between.
        // No aria-label: the visible name is the accessible name (WCAG 2.5.3);
        // the avatar's initials are hidden from it.
        <Button
          component={Link}
          href={`/${lng}/user/${signedIn.id}` as Route}
          // Never "active": profiles live outside the tabs, so this bar is
          // never shown on the account's own page.
          variant="subtle"
          fullWidth
          h="auto"
          py="sm"
          px={4}
        >
          <Center>
            <Stack gap={4} align="center">
              <Avatar size={20} src={signedIn.avatarUrl} name={displayName} aria-hidden />
              <Text size="xs" lh={1} lineClamp={1} maw="10ch">
                {displayName}
              </Text>
            </Stack>
          </Center>
        </Button>
      ) : (
        <Button
          component={Link}
          href={`/${lng}/login?next=${encodeURIComponent(pathname)}` as Route}
          variant="subtle"
          h="auto"
          py="sm"
          px={4}
        >
          <ItemContent Icon={LogIn} label={t('SignIn')} />
        </Button>
      )}
      {myMuseums.length > 0 && (
        <Menu position="top" withArrow shadow="md">
          <Menu.Target>
            <Button
              color="grape"
              variant={inMyMuseum ? 'light' : 'subtle'}
              autoContrast
              h="auto"
              py="sm"
              px={4}
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
    </Group>
  )
}
