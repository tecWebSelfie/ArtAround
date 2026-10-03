'use client'

import { Button, Group, Stack, Text, Center } from '@mantine/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Store } from 'lucide-react'
import { useT } from 'next-i18next/client'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'

import i18nconfig from '@/../i18n.config'

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
  const { t } = useT(undefined, { keyPrefix: 'navbar' })

  return (
    <Group grow gap="xs">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.Icon
        return (
          <Button
            key={item.href}
            component={Link}
            href={item.href}
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
      <LanguageSwitcher supportedLngs={i18nconfig.supportedLngs} />
    </Group>
  )
}
