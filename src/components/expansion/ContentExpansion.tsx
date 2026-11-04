'use client'

import { EXPANSION_ANGLES, MAX_EXPANSION_STEPS, type ExpansionAngle } from '@/lib/expansion'
import { Button, Group, Stack } from '@mantine/core'
import { BookOpen, ChevronsDown, History, Lightbulb } from 'lucide-react'
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
 *
 * "Tell me even more" continues the same angle (`?step=2`, up to
 * `MAX_EXPANSION_STEPS`): each step is written knowing the original and the
 * previous steps, so the story goes on instead of starting over, and the
 * steps stay stacked under each other.
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
  const step = Math.min(Math.max(Number(search.get('step')) || 1, 1), MAX_EXPANSION_STEPS)
  if (locked) return null

  const label: Record<ExpansionAngle, string> = {
    more: t('Tell me more'),
    curiosities: t('Curiosities'),
    story: t('Its story'),
  }
  const go = (next: ExpansionAngle, nextStep: number) => {
    const query = new URLSearchParams(search)
    query.set('more', next)
    if (nextStep > 1) query.set('step', String(nextStep))
    else query.delete('step')
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
              // A new angle starts again from its first step.
              onClick={() => go(option, 1)}
            >
              {label[option]}
            </Button>
          )
        })}
      </Group>
      {angle &&
        Array.from({ length: step }, (_, index) => (
          <ExpansionText
            key={`${angle}-${index + 1}`}
            target={target}
            id={id}
            request={{ kind: 'more', angle, step: index + 1 }}
          />
        ))}
      {angle && step < MAX_EXPANSION_STEPS && (
        <Group>
          <Button
            size="compact-sm"
            radius="xl"
            variant="subtle"
            leftSection={<ChevronsDown size={14} aria-hidden />}
            onClick={() => go(angle, step + 1)}
          >
            {t('Tell me even more')}
          </Button>
        </Group>
      )}
    </Stack>
  )
}
