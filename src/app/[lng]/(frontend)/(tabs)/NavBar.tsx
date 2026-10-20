'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import type { MuseumRole } from '@/fields/MuseumFunction'
import { Avatar, Button, Center, Group, Menu, Stack, Text } from '@mantine/core'
import {
  BadgeCheck,
  Compass,
  Landmark,
  LogIn,
  LogOut,
  Palette,
  Store,
  User as UserIcon,
} from 'lucide-react'
import type { Route } from 'next'
import { useT } from 'next-i18next/client'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'

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
 * Bottom app navigation.
 * - Account entry: the client session (`AuthProvider`) drives the avatar menu
 *   (profile, sign out) so it reacts to sign-in/out without a reload. While its
 *   first `/api/users/me` probe runs, the server session (`account`, from the
 *   tabs layout) answers instead, so the entry never flashes a spinner.
 *   Signed-out visitors sign in and come back to the page they were on (`?next=`).
 * - `myMuseums`: a shortcut to the museums where the visitor is director,
 *   curator or verified creator, shown only when there is at least one.
 */
export const NavBar: React.FC<{ account: { id: string } | null; myMuseums: MyMuseum[] }> =
  function ({ account, myMuseums }) {
    const pathname = usePathname()
    const { lng } = useParams()
    const router = useRouter()
    const { t } = useT(undefined, { keyPrefix: 'navbar' })
    const { logout, status, user } = useAuth()

    const signedIn = status === 'loading' ? account : user ? { id: String(user.id) } : null
    const avatarUrl = typeof user?.avatar === 'object' ? user.avatar?.url : undefined
    const displayName = user?.name?.fullName || user?.username || t('Account')
    const inMyMuseum = myMuseums.some((museum) =>
      pathname.startsWith(`/${lng}/museum/${museum.id}`),
    )

    const handleLogout = async () => {
      try {
        await logout()
      } catch {
        // The provider already cleared local state; still leave the account menu.
      }
      router.push(`/${lng}/navigator` as Route)
      // Server components (tabs layout, viewer-scoped pages) re-read the session.
      router.refresh()
    }

    return (
      <Group grow gap="xs">
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
            >
              <ItemContent Icon={item.Icon} label={t(item.label)} />
            </Button>
          )
        })}
        {signedIn ? (
          <Menu position="top" width={200}>
            <Menu.Target>
              <Button
                variant={pathname.startsWith(`/${lng}/user/`) ? 'light' : 'subtle'}
                fullWidth
                h="auto"
                py="sm"
                aria-label={t('Account')}
              >
                <Center>
                  <Stack gap={4} align="center">
                    <Avatar size={20} src={avatarUrl} name={displayName} />
                    <Text size="xs" lh={1} lineClamp={1} maw="10ch">
                      {displayName}
                    </Text>
                  </Stack>
                </Center>
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                component={Link}
                href={`/${lng}/user/${signedIn.id}` as Route}
                leftSection={<UserIcon size={16} />}
              >
                {t('Profile')}
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<LogOut size={16} />}
                onClick={() => void handleLogout()}
              >
                {t('SignOut')}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button
            component={Link}
            href={`/${lng}/login?next=${encodeURIComponent(pathname)}` as Route}
            variant="subtle"
            h="auto"
            py="sm"
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
