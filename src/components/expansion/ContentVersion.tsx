'use client'

import type { Audience } from '@/lib/expansion'
import type { Content, Difficulty } from '@/payload-types'
import { Button, Group, Stack } from '@mantine/core'
import { Baby, Clock, Feather, GraduationCap, RotateCcw } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ExpansionText } from './ExpansionText'

/**
 * Lets the visitor change a content's difficulty, length and audience
 * while reading it (PRODUCT.md: adjustable at any point of the visit).
 *
 * The choice is URL state: `?level=easy`, `?seconds=60`, `?audience=children`.
 * Without any of them the original body (`children`) shows; with one, the
 * matching version from `/api/expand` replaces it, saved for later visitors
 * as a `contentVariants` document. "Original" removes them again.
 */

const EASIER: Record<Difficulty, Difficulty | null> = { hard: 'medium', medium: 'easy', easy: null }
// "Too simple": one level more detailed (the voice command asks for the hardest).
const HARDER: Record<Difficulty, Difficulty | null> = { easy: 'medium', medium: 'hard', hard: null }
const VERSION_KEYS = ['level', 'seconds', 'audience'] as const

export function ContentVersion({
  content,
  children,
}: {
  content: Pick<Content, 'id' | 'title' | 'body' | 'difficulty' | 'durationSeconds'>
  /** The original body, shown while no version is chosen. */
  children: ReactNode
}) {
  const { t } = useTranslation('tour-navigation')
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  if (!content.body) return children

  const originalSeconds = content.durationSeconds || 60
  const simpler = EASIER[content.difficulty]
  const deeper = HARDER[content.difficulty]
  // "Shorter" halves the length, down to a caption of a few seconds.
  const shorter = originalSeconds >= 10 ? Math.ceil(originalSeconds / 2) : null
  const level = (['easy', 'medium', 'hard'] as const).find((value) => value === search.get('level'))
  const seconds = Number(search.get('seconds')) || null
  const audience: Audience = search.get('audience') === 'children' ? 'children' : 'everyone'
  const changed = Boolean(level || seconds || audience === 'children')

  const toggle = (key: (typeof VERSION_KEYS)[number], value: string | null) => {
    const query = new URLSearchParams(search)
    if (value === null || query.get(key) === value) query.delete(key)
    else query.set(key, value)
    // A new version comes with its own text: any "Tell me more" closes.
    query.delete('more')
    query.delete('step')
    router.replace(`${pathname}?${query}` as Route, { scroll: false })
  }
  const original = () => {
    const query = new URLSearchParams(search)
    for (const key of VERSION_KEYS) query.delete(key)
    router.replace(`${pathname}?${query}` as Route, { scroll: false })
  }

  return (
    <Stack gap="xs">
      <Group gap="xs" aria-label={t('Reading options')} role="group">
        <Button
          size="compact-sm"
          radius="xl"
          variant={level && level === simpler ? 'filled' : 'default'}
          leftSection={<Feather size={14} aria-hidden />}
          disabled={!simpler}
          aria-pressed={Boolean(level && level === simpler)}
          onClick={() => toggle('level', simpler)}
        >
          {t('Simpler')}
        </Button>
        <Button
          size="compact-sm"
          radius="xl"
          variant={level && level === deeper ? 'filled' : 'default'}
          leftSection={<GraduationCap size={14} aria-hidden />}
          disabled={!deeper}
          aria-pressed={Boolean(level && level === deeper)}
          onClick={() => toggle('level', deeper)}
        >
          {t('More in depth')}
        </Button>
        <Button
          size="compact-sm"
          radius="xl"
          variant={seconds ? 'filled' : 'default'}
          leftSection={<Clock size={14} aria-hidden />}
          disabled={!shorter && !seconds}
          aria-pressed={Boolean(seconds)}
          onClick={() => toggle('seconds', shorter ? String(shorter) : null)}
        >
          {t('Shorter')}
        </Button>
        <Button
          size="compact-sm"
          radius="xl"
          variant={audience === 'children' ? 'filled' : 'default'}
          leftSection={<Baby size={14} aria-hidden />}
          aria-pressed={audience === 'children'}
          onClick={() => toggle('audience', 'children')}
        >
          {t('For children')}
        </Button>
        {changed && (
          <Button
            size="compact-sm"
            radius="xl"
            variant="subtle"
            color="gray"
            leftSection={<RotateCcw size={14} aria-hidden />}
            onClick={original}
          >
            {t('Original')}
          </Button>
        )}
      </Group>
      {changed ? (
        <div>
          <h2>{content.title}</h2>
          <ExpansionText
            target="contents"
            id={content.id}
            request={{
              kind: 'version',
              // Children always get the easiest wording.
              difficulty: audience === 'children' ? 'easy' : (level ?? content.difficulty),
              seconds: seconds ?? originalSeconds,
              audience,
            }}
          />
        </div>
      ) : (
        children
      )}
    </Stack>
  )
}
