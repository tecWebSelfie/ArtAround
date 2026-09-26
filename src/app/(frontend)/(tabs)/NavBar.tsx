'use client'

import { Button, Group, Stack, Text, Center } from '@mantine/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Store } from 'lucide-react'

const items = [
  { label: 'navigator', Icon: Compass, color: 'green', href: '/navigator' },
  { label: 'store', Icon: Store, color: 'red', href: '/marketplace' },
] as const

export default function NavBar() {
  const pathname = usePathname()

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
                  {item.label}
                </Text>
              </Stack>
            </Center>
          </Button>
        )
      })}
    </Group>
  )
}
