'use client'

import { Button, Group, Stack, Text, Center } from '@mantine/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Store } from 'lucide-react'
import { defineMessages, useIntl } from 'react-intl'
import { LanguageSwitcher } from '@/components/mantine/LanguageSwitcher'

const msgs = defineMessages({
  navigator: { id: 'nav.tabs.navigator', defaultMessage: 'navigator' },
  marketplace: { id: 'nav.tabs.marketplace', defaultMessage: 'store' },
})

const items = [
  { msg: msgs.navigator, Icon: Compass, color: 'green', href: '/navigator' },
  { msg: msgs.marketplace, Icon: Store, color: 'red', href: '/marketplace' },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const intl = useIntl()

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
                  {intl.formatMessage(item.msg)}
                </Text>
              </Stack>
            </Center>
          </Button>
        )
      })}
      <LanguageSwitcher />
    </Group>
  )
}
