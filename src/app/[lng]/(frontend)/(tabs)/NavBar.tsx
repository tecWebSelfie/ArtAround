'use client'

import {
  AccountMenuItems,
  MyMuseumsMenuItems,
  NAV_ITEMS,
  useNavState,
  type MyMuseum,
  type NavAccount,
} from '@/components/navigation/nav-shared'
import { Avatar, Button, Center, Group, Menu, Stack, Text } from '@mantine/core'
import { Compass, Landmark, LogIn } from 'lucide-react'
import Link from 'next/link'

export type { MyMuseum, NavAccount }

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
 * Entries, account and museum menus come from `nav-shared` so both bars
 * agree; here every entry is an icon over an `xs` label and menus open upward.
 * - Account entry: signed-out visitors sign in and come back to the page they
 *   were on (`?next=`).
 * - `myMuseums`: a shortcut to the museums where the visitor is director,
 *   curator or verified creator, shown only when there is at least one.
 */
export const NavBar: React.FC<{ account: NavAccount | null; myMuseums: MyMuseum[] }> = function ({
  account,
  myMuseums,
}) {
  const { t, lng, signedIn, displayName, inMyMuseum, signInHref, localize, isActive, handleLogout } =
    useNavState(account, myMuseums)

  // Tight horizontal padding (px={4}) on every entry: with four entries a
  // phone leaves ~90px each, enough for "Marketplace" only without the
  // default button padding.
  return (
    <Group grow gap={4}>
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
            h="auto"
            py="sm"
            px={4}
          >
            <ItemContent Icon={item.Icon} label={t(item.label)} />
          </Button>
        )
      })}
      {signedIn ? (
        <Menu position="top" width={200}>
          <Menu.Target>
            {/* No aria-label: the visible name is the accessible name
                  (WCAG 2.5.3); the avatar's initials are hidden from it. */}
            <Button
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
          href={signInHref}
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
            <MyMuseumsMenuItems lng={lng} myMuseums={myMuseums} />
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  )
}
