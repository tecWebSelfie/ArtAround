'use client'

import { NAV_ITEMS, useNavState, type NavAccount } from '@/components/navigation/nav-shared'
import { Avatar, Button, Center, Group, Stack, Text } from '@mantine/core'
import { Compass, LogIn } from 'lucide-react'
import { ProgressLink } from '@/components/navigation/ProgressLink'
import { useT } from 'next-i18next/client'

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
 * Bottom app navigation, phones and tablets only: from `md` the desktop top
 * bar (`SiteHeader`) takes over and the tabs layout hides this footer.
 * Entries and account come from `nav-shared` so both bars agree; here every
 * entry is an icon over an `xs` label.
 * - Account entry: a link straight to the visitor's profile, where they sign
 *   out (`SignOutButton`). Signed-out visitors sign in and come back to the
 *   page they were on (`?next=`).
 * - The museums the visitor works on are reached from the profile
 *   (`/[lng]/my-museums`), not from here: the bar stays at three entries.
 */
export const NavBar: React.FC<{ account: NavAccount | null }> = function ({ account }) {
  const { signedIn, profileHref, displayName, signInHref, localize, isActive } =
    useNavState(account)
  // Here, not from `useNavState`: `i18next-cli extract` reads the prefix only at the call.
  const { t } = useT(undefined, { keyPrefix: 'navbar' })

  // Tight horizontal padding (px={4}) on every entry: a narrow phone leaves
  // ~90px each, enough for "Marketplace" only without the default padding.
  return (
    <Group grow gap={4}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Button
            key={item.href}
            component={ProgressLink}
            href={localize(item.href)}
            color={item.color}
            variant={active ? 'light' : 'subtle'}
            autoContrast
            aria-current={active ? 'page' : undefined}
            h="auto"
            py="sm"
            px={4}
          >
            <ItemContent Icon={item.Icon} label={t(item.label)} />
          </Button>
        )
      })}
      {signedIn && profileHref ? (
        // Straight to the profile: signing out lives there (`SignOutButton`,
        // shown on the viewer's own profile), so no menu stands in between.
        // No aria-label: the visible name is the accessible name (WCAG 2.5.3);
        // the avatar's initials are hidden from it.
        <Button
          component={ProgressLink}
          href={profileHref}
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
        <Button component={ProgressLink} href={signInHref} variant="subtle" h="auto" py="sm" px={4}>
          <ItemContent Icon={LogIn} label={t('SignIn')} />
        </Button>
      )}
    </Group>
  )
}
