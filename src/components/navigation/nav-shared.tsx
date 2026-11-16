'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { type NavAccount, toNavAccount } from '@/components/navigation/nav-account'
import { Compass, Store } from 'lucide-react'
import type { Route } from 'next'
import { useT } from 'next-i18next/client'
import { useParams, usePathname } from 'next/navigation'

/**
 * What the two navigation bars share: the phone's bottom bar (`NavBar`, tabs
 * layout) and the desktop top bar (`SiteHeader`, frontend layout) show the
 * same entries and account from the same logic, only laid out differently.
 * Keep entries and colors here so the two never drift apart.
 *
 * The museums a visitor works on are not a bar entry: they live on a page of
 * their own (`/[lng]/my-museums`), linked from the visitor's profile, so the
 * bars stay the same for visitors and staff.
 */

/**
 * The tab entries. Each keeps its color in both bars: Navigator green, Marketplace red.
 * Labels are `navbar` keys of `common`; listed here for `i18next-cli extract`,
 * which can't read a key out of a variable:
 * t('navbar.Navigator', 'Navigator') t('navbar.Marketplace', 'Marketplace')
 */
export const NAV_ITEMS = [
  { Icon: Compass, color: 'green', label: 'Navigator', href: '/navigator' },
  { Icon: Store, color: 'red', label: 'Marketplace', href: '/marketplace' },
] as const

export type { NavAccount }

/**
 * Navigation state for either bar.
 * - The client session (`AuthProvider`) drives the account entry so it reacts
 *   to sign-in/out without a reload. While its first `/api/users/me` probe
 *   runs, the server session (`account`) answers instead, so the entry renders
 *   the real visitor at once instead of a spinner or a placeholder name.
 * - `isActive` localizes the href (/it/navigator) so the check matches the
 *   actual pathname, with no redirect hop.
 * - No sign out here: in both bars the account entry links to the profile,
 *   which carries `SignOutButton`.
 */
export function useNavState(account: NavAccount | null) {
  const pathname = usePathname()
  const { lng } = useParams<{ lng: string }>()
  const { t } = useT(undefined, { keyPrefix: 'navbar' })
  const { status, user } = useAuth()

  // While the session loads, the account the server rendered stays shown.
  const loaded = user ? toNavAccount(user) : null
  const signedIn: NavAccount | null = status === 'loading' ? account : loaded

  const localize = (href: string) => `/${lng}${href}` as Route
  const isActive = (href: string) => {
    const localized = localize(href)
    return pathname === localized || pathname.startsWith(`${localized}/`)
  }

  return {
    pathname,
    signedIn,
    // Both bars link the account entry to the profile (it carries sign out).
    profileHref: signedIn ? (`/${lng}/user/${signedIn.id}` as Route) : null,
    displayName: signedIn?.name || t('Account'),
    signInHref: `/${lng}/login?next=${encodeURIComponent(pathname)}` as Route,
    localize,
    isActive,
  }
}
