'use client'

import { EXPANSION_ANGLES, type ExpansionAngle } from '@/lib/expansion'
import { Button, Group, Stack } from '@mantine/core'
import { BookOpen, History, Lightbulb } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ExpansionText } from './ExpansionText'

/**
 * "Tell me more" inside a content, step or object modal: three pills and,
 * once one is chosen, the extra text right after the original.
 *
 * The chosen angle lives in the URL (`?more=curiosities`), like every other
 * navigation state, so the voice assistant can open it as a command and a
 * shared link shows the same text. The pills name what the visitor gets,
 * never how it is made.
 */

const ICONS: Record<ExpansionAngle, typeof BookOpen> = {
  more: BookOpen,
  curiosities: Lightbulb,
  story: History,
}

export function ContentExpansion({
  target,
  id,
  locked = false,
}: {
  target: 'contents' | 'objects'
  id: string
  /** A paid content the visitor has not unlocked gets no extra text. */
  locked?: boolean
}) {
  const { t } = useTranslation('tour-navigation')
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const angle = EXPANSION_ANGLES.find((option) => option === search.get('more')) ?? null
  if (locked) return null

  const label: Record<ExpansionAngle, string> = {
    more: t('Tell me more'),
    curiosities: t('Curiosities'),
    story: t('Its story'),
  }
  const choose = (next: ExpansionAngle) => {
    const query = new URLSearchParams(search)
    query.set('more', next)
    router.replace(`${pathname}?${query}` as Route, { scroll: false })
  }

  return (
    <Stack gap="sm" mt="md">
      <Group gap="xs">
        {EXPANSION_ANGLES.map((option) => {
          const Icon = ICONS[option]
          return (
            <Button
              key={option}
              size="compact-sm"
              radius="xl"
              variant={option === angle ? 'filled' : 'light'}
              leftSection={<Icon size={14} aria-hidden />}
              aria-pressed={option === angle}
              onClick={() => choose(option)}
            >
              {label[option]}
            </Button>
          )
        })}
      </Group>
      {angle && <ExpansionText target={target} id={id} request={{ kind: 'more', angle }} />}
    </Stack>
  )
}
