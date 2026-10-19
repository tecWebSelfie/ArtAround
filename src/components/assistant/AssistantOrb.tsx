'use client'

import { UnstyledButton, VisuallyHidden } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
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
 */
export type AssistantState = 'off' | 'loading' | 'ready' | 'listening' | 'thinking' | 'speaking'

/** Ball settings per state; `level` (0–1) is the live voice loudness. */
function ballSettings(state: AssistantState, level: number) {
  switch (state) {
    case 'off':
      return { speed: 0, glow: 0.35, crackle: 0.2, sparks: 0, flares: 0, paused: true }
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
  const [loudness, setLoudness] = useState(0)
  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') return setLoudness(0)
    let frame = requestAnimationFrame(function tick() {
      setLoudness(level?.current ?? 0)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [state, level])

  const settings = ballSettings(state, loudness)
  return (
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
        interactive={false}
        intro={false}
        {...settings}
        paused={settings.paused || reducedMotion}
        style={{ width: size, height: size, pointerEvents: 'none' }}
      />
      <VisuallyHidden role="status" aria-live="polite">
        {status}
      </VisuallyHidden>
    </UnstyledButton>
  )
}
