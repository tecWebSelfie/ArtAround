'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import type { MuseumRole } from '@/fields/MuseumFunction'
import { Menu, Stack, Text } from '@mantine/core'
import { BadgeCheck, Compass, Landmark, LogOut, Palette, Store, User as UserIcon } from 'lucide-react'
import type { Route } from 'next'
import { useT } from 'next-i18next/client'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'

/**
 * What the two navigation bars share: the phone's bottom bar (`NavBar`, tabs
 * layout) and the desktop top bar (`SiteHeader`, frontend layout) show the
 * same entries, account and museums from the same logic, only laid out
 * differently. Keep entries, colors and menu contents here so the two never
 * drift apart.
 */

/** The tab entries. Each keeps its color in both bars: Navigator green, Marketplace red. */
export const NAV_ITEMS = [
  { Icon: Compass, color: 'green', label: 'Navigator', href: '/navigator' },
  { Icon: Store, color: 'red', label: 'Marketplace', href: '/marketplace' },
] as const

/** The signed-in visitor as the server session sees it (`getSiteChrome`). */
export type NavAccount = { id: string; name?: string | null; avatarUrl?: string | null }

/** A museum where the signed-in visitor holds a per-museum role. */
export type MyMuseum = { id: string; name: string; role: MuseumRole }

// Same icon per role as the profile badges (UserPage): icon + label, never color alone.
const ROLE_META: Record<MuseumRole, { Icon: typeof Landmark; label: string }> = {
  director: { Icon: Landmark, label: 'Director' },
  curator: { Icon: Palette, label: 'Curator' },
  verified: { Icon: BadgeCheck, label: 'Verified creator' },
}

/**
 * Navigation state for either bar.
 * - The client session (`AuthProvider`) drives the account entry so it reacts
 *   to sign-in/out without a reload. While its first `/api/users/me` probe
 *   runs, the server session (`account`) answers instead, so the entry renders
 *   the real visitor at once instead of a spinner or a placeholder name.
 * - `isActive` localizes the href (/it/navigator) so the check matches the
 *   actual pathname, with no redirect hop.
 */
export function useNavState(account: NavAccount | null, myMuseums: MyMuseum[]) {
  const pathname = usePathname()
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  const { logout, status, user } = useAuth()

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

  const localize = (href: string) => `/${lng}${href}` as Route
  const isActive = (href: string) => {
    const localized = localize(href)
    return pathname === localized || pathname.startsWith(`${localized}/`)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // The provider already cleared local state; still leave the account menu.
    }
    router.push(`/${lng}/navigator` as Route)
    // Server components (layouts, viewer-scoped pages) re-read the session.
    router.refresh()
  }

  return {
    t,
    lng,
    pathname,
    signedIn,
    displayName: signedIn?.name || t('Account'),
    inMyMuseum: myMuseums.some((museum) => pathname.startsWith(`/${lng}/museum/${museum.id}`)),
    signInHref: `/${lng}/login?next=${encodeURIComponent(pathname)}` as Route,
    localize,
    isActive,
    handleLogout,
  }
}

/** The account menu's items: the profile, then a red "Sign out". */
export function AccountMenuItems({
  lng,
  accountId,
  onLogout,
}: {
  lng: string
  accountId: string
  onLogout: () => void
}) {
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  return (
    <>
      <Menu.Item
        component={Link}
        href={`/${lng}/user/${accountId}` as Route}
        leftSection={<UserIcon size={16} />}
      >
        {t('Profile')}
      </Menu.Item>
      <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={onLogout}>
        {t('SignOut')}
      </Menu.Item>
    </>
  )
}

/** One row per museum where the visitor holds a role: name over its dimmed role label. */
export function MyMuseumsMenuItems({ lng, myMuseums }: { lng: string; myMuseums: MyMuseum[] }) {
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  return myMuseums.map((museum) => {
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
  })
}
