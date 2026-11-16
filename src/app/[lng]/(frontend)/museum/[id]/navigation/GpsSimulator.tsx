'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

/** Walking pace (m/s) at a full push of the stick or a held arrow key. */
const WALK_SPEED = 1.4

/**
 * How often a held stick reports its walk, in milliseconds: often enough for
 * the avatar (which walks between reports, see `WalkingAvatar`) to move as
 * one continuous walk, rarely enough not to re-render the page every frame.
 */
const TICK_MS = 100

/** A tapped arrow key (not held) nudges this far, for precise placing and tests. */
export const SIMULATOR_NUDGE_METRES = 1

/** Base diameter and how far the knob travels from the centre, in px. */
const BASE = 72
const TRAVEL = 22

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

/**
 * Joystick for the simulated GPS source, the way a game pad moves a
 * character: push the knob towards a direction and the fake fix walks that
 * way continuously (up is north, the top of the map), faster the further the
 * knob is pushed, up to walking pace; let go and it stops. It sits on the
 * overlay's left edge above the support tools and covers as little of the
 * map as it can: a small translucent ring with one solid knob.
 *
 * Keyboard: focus it, tap an arrow to nudge 1 m, hold it to walk.
 * A developer and test tool (`GPS_SIMULATOR_ENABLED`), not a visitor feature.
 */
export function GpsSimulator({ onMove }: { onMove: (east: number, north: number) => void }) {
  const { t } = useTranslation('tour-navigation')
  const base = useRef<HTMLDivElement>(null)
  // The knob's offset from the centre, in px (y grows downwards, south).
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const timer = useRef<number | null>(null)
  // The push, -1..1 on each axis: from the stick, or from the held arrows.
  const vector = useRef({ east: 0, north: 0 })
  const held = useRef(new Set<string>())
  const dragging = useRef(false)
  // The latest callback, read by the running timer.
  const move = useRef(onMove)
  useEffect(() => {
    move.current = onMove
  }, [onMove])
  // Unmounted mid-walk (the simulator switched off): no step after that.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    },
    [],
  )

  const walk = () => {
    timer.current ??= window.setInterval(() => {
      const { east, north } = vector.current
      const metres = (WALK_SPEED * TICK_MS) / 1000
      if (east || north) move.current(east * metres, north * metres)
    }, TICK_MS)
  }
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    vector.current = { east: 0, north: 0 }
    held.current.clear()
    dragging.current = false
    setKnob({ x: 0, y: 0 })
  }

  const aim = (event: PointerEvent<HTMLDivElement>) => {
    const box = base.current?.getBoundingClientRect()
    if (!box) return
    const dx = event.clientX - (box.left + box.width / 2)
    const dy = event.clientY - (box.top + box.height / 2)
    // Clamped to the ring: past its edge the push is simply full.
    const length = Math.hypot(dx, dy)
    const scale = length > TRAVEL ? TRAVEL / length : 1
    const x = dx * scale
    const y = dy * scale
    setKnob({ x, y })
    vector.current = { east: x / TRAVEL, north: -y / TRAVEL }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    aim(event)
    walk()
  }

  // Held arrows push the knob like a d-pad (diagonals combine).
  const steer = () => {
    let east = 0
    let north = 0
    for (const key of held.current) {
      east += ARROWS[key][0]
      north += ARROWS[key][1]
    }
    const length = Math.hypot(east, north) || 1
    vector.current = { east: east / length, north: north / length }
    setKnob({ x: (east / length) * TRAVEL, y: (-north / length) * TRAVEL })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    if (!event.repeat) {
      // A tap nudges at once; only holding (key repeat) starts walking.
      move.current(arrow[0] * SIMULATOR_NUDGE_METRES, arrow[1] * SIMULATOR_NUDGE_METRES)
      return
    }
    held.current.add(event.key)
    steer()
    walk()
  }
  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!held.current.delete(event.key)) return
    if (held.current.size) steer()
    else stop()
  }

  // A 2-D stick has no ARIA widget role (a slider is one-dimensional):
  // `application` hands it its arrow keys (screen readers pass them through)
  // and the role description names it. jsx-a11y doesn't count `application`
  // as interactive, hence the two exceptions below.
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={base}
      role="application"
      aria-roledescription={t('joystick')}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-label={t('Simulated GPS: drag, or use the arrow keys')}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => dragging.current && aim(event)}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={stop}
      // `touch-none`: dragging the stick must not pan the map or the page.
      className="mantine-focus-auto pointer-events-auto relative grid shrink-0 cursor-grab touch-none place-items-center rounded-full border border-(--mantine-color-default-border) bg-(--mantine-color-body)/40 shadow-(--mantine-shadow-xs) select-none active:cursor-grabbing"
      style={{ width: BASE, height: BASE }}
    >
      <span
        aria-hidden
        className="block size-7 rounded-full bg-(--mantine-color-dark-6) shadow-(--mantine-shadow-sm) motion-safe:transition-transform motion-safe:duration-75"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
