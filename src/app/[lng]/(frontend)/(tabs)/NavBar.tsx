'use client'

import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'
import { Button, Center, Group, Stack, Text } from '@mantine/core'
import { Compass, Store } from 'lucide-react'
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

export const NavBar: React.FC = function () {
  const pathname = usePathname()
  const { lng } = useParams()
  const { t } = useT(undefined, { keyPrefix: 'navbar' })

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
            href={href}
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
      <LanguageSwitcher supportedLngs={i18nConfig.supportedLngs} />
    </Group>
  )
}
