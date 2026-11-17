'use client'

import { Tooltip, UnstyledButton, VisuallyHidden } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { Mic } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import CrystalizedBall from './CrystalizedBall'

/**
 * The assistant's single identity across the app: a crystallized ball (React
 * Bits `CrystalizedBall`, ember preset) that is dormant when the assistant is
 * off and reacts to the visitor's voice and to its own speech when it is on.
 *
 * The microphone is open only in `listening`. Every other state, including
 * `ready`, keeps the mic closed, and the orb must make that difference
 * obvious: `ready` only breathes slowly, `listening` follows the voice.
 *
 * Read as something to press, not as decoration:
 * - `off` is asleep, not dead: a dim ember that keeps drifting very slowly.
 *   Frozen, it looked like an image or a disabled control. Only reduced
 *   motion stills it.
 * - while the mic is closed (`off`, `ready`) a small mic badge sits on the
 *   orb's edge (the same corner mark as the language switcher's), saying
 *   "voice" in a glance; it goes once the orb itself listens or speaks.
 * - with a pointer, the ball leans towards it (React Bits' own `interactive`
 *   reaction) and a tooltip names what pressing it does.
 */
export type AssistantState = 'off' | 'loading' | 'ready' | 'listening' | 'thinking' | 'speaking'

/** Ball settings per state; `level` (0–1) is the live voice loudness. */
function ballSettings(state: AssistantState, level: number) {
  switch (state) {
    case 'off':
      // Asleep: barely moving, dim, no sparks; still alive.
      return { speed: 0.05, glow: 0.45, crackle: 0.25, sparks: 0.05, flares: 0.05, paused: false }
    case 'loading':
    case 'ready':
      return { speed: 0.15, glow: 0.8, crackle: 0.4, sparks: 0.2, flares: 0.2, paused: false }
    case 'listening':
    case 'speaking':
      return {
        speed: 0.4 + level * 1.6,
        glow: 1 + level * 0.6,
        crackle: 0.5 + level * 0.5,
        sparks: 0.3 + level * 0.7,
        flares: 0.3 + level * 0.7,
        paused: false,
      }
    case 'thinking':
      return { speed: 1.2, glow: 1.1, crackle: 0.9, sparks: 0.6, flares: 0.5, paused: false }
  }
}

export function AssistantOrb({
  state,
  level,
  label,
  status,
  onPress,
  size = 52,
}: {
  state: AssistantState
  /** Live loudness written by the mic or the speech player, read every frame. */
  level?: RefObject<number>
  /** Accessible name: what pressing the orb does now. */
  label: string
  /** Announced to screen readers when the state changes. */
  status: string
  onPress: () => void
  size?: number
}) {
  const reducedMotion = useReducedMotion()
  // Sample the loudness ref once per frame while the orb reacts to a voice.
  // Outside those states the orb reads 0 at render time instead of resetting
  // the state from the effect, which would cost an extra render.
  const reacting = state === 'listening' || state === 'speaking'
  const [sampled, setSampled] = useState(0)
  useEffect(() => {
    if (!reacting) return
    let frame = requestAnimationFrame(function tick() {
      setSampled(level?.current ?? 0)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [reacting, level])

  const settings = ballSettings(state, reacting ? sampled : 0)
  const micClosed = state === 'off' || state === 'ready'
  return (
    <Tooltip label={label} events={{ hover: true, focus: true, touch: false }}>
      <UnstyledButton
        onClick={onPress}
        aria-label={label}
        aria-pressed={state === 'listening'}
        data-state={state}
        className="relative grid place-items-center rounded-full"
        style={{ width: size, height: size }}
      >
        <CrystalizedBall
          preset="ember"
          color="#FF8A2A"
          theme="light"
          particleCount={6000}
          fill={0.35}
          depth={0.7}
          sway={0.3}
          twinkle={0.7}
          haze={1.05}
          dustSpeed={1.6}
          strands={5}
          particleShape="round"
          interactive
          hoverStrength={0.5}
          intro={false}
          {...settings}
          paused={settings.paused || reducedMotion}
          style={{ width: size, height: size, pointerEvents: 'none' }}
        />
        {micClosed && (
          // Cut out of the orb's edge by a page-colored halo, like the
          // language switcher's corner mark; decorative (the name says it).
          <span
            aria-hidden
            className="pointer-events-none absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border border-[light-dark(var(--mantine-color-gray-5),var(--mantine-color-dark-3))] bg-[light-dark(var(--mantine-color-gray-1),var(--mantine-color-dark-5))] text-[light-dark(var(--mantine-color-gray-8),var(--mantine-color-dark-0))] shadow-[0_0_0_2px_var(--mantine-color-body)]"
          >
            <Mic size={11} strokeWidth={2.5} />
          </span>
        )}
        <VisuallyHidden role="status" aria-live="polite">
          {status}
        </VisuallyHidden>
      </UnstyledButton>
    </Tooltip>
  )
}
