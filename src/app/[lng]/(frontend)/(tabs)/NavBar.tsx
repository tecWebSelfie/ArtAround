'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { Avatar, Button, Center, Group, Menu, Stack, Text } from '@mantine/core'
import { Compass, LogIn, LogOut, Store, User as UserIcon } from 'lucide-react'
import { useT } from 'next-i18next/client'
import Link from 'next/link'
import type { Route } from 'next'
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

export const NavBar: React.FC = function () {
  const pathname = usePathname()
  const { lng } = useParams()
  const router = useRouter()
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  const { logout, status, user } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // The provider already cleared local state; still leave the account menu.
    }
    router.push(`/${lng}/navigator`)
    router.refresh()
  }

  const avatarUrl = typeof user?.avatar === 'object' ? user.avatar?.url : undefined
  const displayName = user?.name?.fullName || user?.username

  return (
    <Group grow gap="xs">
      {items.map((item) => {
        // Links must be localized (/it/navigator) so the active-state check
        // matches the actual pathname (no redirect hop).
        const href = `/${lng}${item.href}`
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        const Icon = item.Icon
        return (
          <Button
            key={item.href}
            component={Link}
            href={href as Route}
            color={item.color}
            variant={isActive ? 'light' : 'subtle'}
            autoContrast
            aria-current={isActive ? 'page' : undefined}
            h="auto"
            py="sm"
          >
            <Center>
              <Stack gap={4} align="center">
                <Icon size={20} />
                <Text size="xs" lh={1}>
                  {t(item.label)}
                </Text>
              </Stack>
            </Center>
          </Button>
        )
      })}

      {status === 'loading' ? (
        <Button variant="subtle" loading h="auto" py="sm" aria-label={t('Account')} />
      ) : user && displayName ? (
        <Menu position="top" width={200}>
          <Menu.Target>
            <Button variant="subtle" fullWidth h="auto" py="sm" aria-label={t('Account')}>
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
              href={`/${lng}/user/${user.id}` as Route}
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
        <Button component={Link} href={`/${lng}/login` as Route} variant="subtle" h="auto" py="sm">
          <Center>
            <Stack gap={4} align="center">
              <LogIn size={20} />
              <Text size="xs" lh={1}>
                {t('SignIn')}
              </Text>
            </Stack>
          </Center>
        </Button>
      )}

      <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
    </Group>
  )
}
