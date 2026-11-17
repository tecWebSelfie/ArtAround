'use client'

import { ActionIcon, Box, Tooltip, VisuallyHidden } from '@mantine/core'
import { Mic, MicOff, Volume2, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'

/**
 * The voice assistant's control in the navigation bar: a round microphone
 * button whose look says, at a glance, whether the microphone is open.
 *
 * - `off`: an outlined button with a struck-through mic. A tap opts in.
 * - `loading`: the button's own loader while the voice model starts.
 * - `ready`: a filled primary-color button with a mic; the mic is closed.
 * - `listening`: the only state with the mic open. Rings of the same color
 *   leave the button's edge and widen, one after the other, and a halo under
 *   the button swells with the visitor's voice, so they see it hears them.
 * - `thinking`: the loader on the filled button: it heard, it is answering.
 * - `speaking`: a speaker icon; the halo follows the assistant's voice.
 *
 * The reply also appears as a notification titled with the visitor's words
 * (NavigationAssistant), so "it understood me" is never only audio. Under
 * reduced motion the rings stand still as one outline around the button.
 */
export type AssistantState = 'off' | 'loading' | 'ready' | 'listening' | 'thinking' | 'speaking'

const STATE_ICON: Partial<Record<AssistantState, LucideIcon>> = { off: MicOff, speaking: Volume2 }

export function AssistantButton({
  state,
  level,
  label,
  status,
  onPress,
}: {
  state: AssistantState
  /** Live loudness (0–1) written by the mic or the speech player, read every frame. */
  level?: RefObject<number>
  /** Accessible name and tooltip: what pressing the button does now. */
  label: string
  /** Announced to screen readers when the state changes. */
  status: string
  onPress: () => void
}) {
  const reacting = state === 'listening' || state === 'speaking'
  // The halo follows the voice level frame by frame; written to the element
  // directly, since a React render per frame would be wasted work.
  const halo = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!reacting) return
    let written = -1
    let frame = requestAnimationFrame(function tick() {
      const next = level?.current ?? 0
      // Only a change the eye can see restyles the halo.
      if (Math.abs(next - written) >= 0.01) {
        written = next
        halo.current?.style.setProperty('--level', String(next))
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [reacting, level])

  // A mic in every other state (the loader covers it while loading or thinking).
  const Icon = STATE_ICON[state] ?? Mic
  const off = state === 'off'
  return (
    <Box pos="relative" className="grid size-[52px] shrink-0 place-items-center">
      {state === 'listening' &&
        [0, 1].map((ring) => (
          <span
            key={ring}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-(--mantine-primary-color-filled) animate-[assistant-ring_1.8s_cubic-bezier(0.16,1,0.3,1)_infinite] motion-reduce:scale-[1.18] motion-reduce:animate-none motion-reduce:opacity-60"
            // The second ring leaves half a period later, so one is always on its way.
            style={{ animationDelay: `${ring * 0.9}s` }}
          />
        ))}
      {reacting && (
        <span
          ref={halo}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-(--mantine-primary-color-light) scale-[calc(1+var(--level,0)*0.45)] transition-transform duration-75 motion-reduce:scale-100"
        />
      )}
      <Tooltip label={label} events={{ hover: true, focus: true, touch: false }}>
        <ActionIcon
          onClick={onPress}
          aria-label={label}
          aria-pressed={state === 'listening'}
          data-state={state}
          variant={off ? 'default' : 'filled'}
          loading={state === 'loading' || state === 'thinking'}
          size={52}
          radius="xl"
          className="relative shadow-sm"
        >
          <Icon size={24} strokeWidth={2.25} />
        </ActionIcon>
      </Tooltip>
      <VisuallyHidden role="status" aria-live="polite">
        {status}
      </VisuallyHidden>
    </Box>
  )
}
