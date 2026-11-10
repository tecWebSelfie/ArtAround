'use client'

import { Button } from '@mantine/core'
import { Pause, Volume2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExpansionRequest } from '@/lib/expansion'

/**
 * "Listen": plays the displayed base text or selected version in the page's language
 * (`/api/content-audio/[id]`, `src/lib/content-audio.ts`). The first press
 * may have to wait while the audio is generated (or the translation it reads
 * is written): the button shows it is preparing and asks the server again
 * every few seconds. Then it toggles play and pause.
 *
 * Rendered only next to a readable body: a locked paid content has no audio
 * either (the route refuses it too).
 */

type State = 'idle' | 'preparing' | 'playing' | 'paused' | 'unavailable'

/** How often, and for how long, to ask whether the audio is ready. */
const POLL_MS = 3_000
const MAX_POLLS = 40

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ContentAudioButton({
  contentId,
  version,
}: {
  contentId: string
  version?: Extract<ExpansionRequest, { kind: 'version' }>
}) {
  // Storybook and tests may render it outside a `[lng]` route.
  const lng = useParams<{ lng?: string }>()?.lng
  const query = new URLSearchParams({ locale: lng ?? 'en' })
  if (version) query.set('version', JSON.stringify(version))
  const url = `/api/content-audio/${contentId}?${query}`
  // A new language/reader/version owns a fresh player: stale preparation cannot resume.
  return <AudioControl key={url} url={url} />
}

function AudioControl({ url }: { url: string }) {
  const { t } = useTranslation('tour-navigation')
  const [state, setState] = useState<State>('idle')
  const audio = useRef<HTMLAudioElement | null>(null)

  // Aborted on unmount: a press still waiting for the audio must not start
  // it once the visitor has left the modal.
  const unmounted = useRef<AbortController | null>(null)

  // Leaving the page or modal stops the voice, and any wait for it.
  useEffect(() => {
    const controller = new AbortController()
    unmounted.current = controller
    return () => {
      controller.abort()
      audio.current?.pause()
    }
  }, [])

  const prepare = async () => {
    const signal = unmounted.current?.signal
    if (!signal) return
    setState('preparing')
    for (let poll = 0; poll < MAX_POLLS; poll++) {
      const response = await fetch(`${url}&check=1`, { cache: 'no-store', signal }).catch(
        () => null,
      )
      const { status } = ((await response?.json().catch(() => null)) ?? {}) as { status?: string }
      if (signal.aborted) return
      if (status === 'ready') {
        const player = new Audio(url)
        player.addEventListener('ended', () => setState('paused'))
        audio.current = player
        await player.play().catch(() => undefined)
        if (signal.aborted) {
          player.pause()
          return
        }
        setState(player.paused ? 'paused' : 'playing')
        return
      }
      if (status !== 'pending' && status !== 'translating') break
      await wait(POLL_MS)
      if (signal.aborted) return
    }
    setState('unavailable')
  }

  const onClick = () => {
    const player = audio.current
    if (!player) return void prepare()
    if (player.paused) {
      void player
        .play()
        .then(() => {
          if (unmounted.current?.signal.aborted) player.pause()
          else setState('playing')
        })
        .catch(() => {
          if (!unmounted.current?.signal.aborted) setState('paused')
        })
    } else {
      player.pause()
      setState('paused')
    }
  }

  const label =
    state === 'preparing'
      ? t('Preparing the audio')
      : state === 'unavailable'
        ? t('Audio not available')
        : state === 'playing'
          ? t('Pause')
          : t('Listen')

  return (
    <Button
      size="compact-sm"
      radius="xl"
      variant="light"
      leftSection={
        state === 'playing' ? <Pause size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />
      }
      loading={state === 'preparing'}
      disabled={state === 'unavailable'}
      aria-pressed={state === 'playing'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
