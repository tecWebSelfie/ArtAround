'use client'

import { useFrame } from '@react-three/fiber'
import type { Vec3 } from 'navcat'
import { useRef, useState } from 'react'
import type { Group } from 'three'

/**
 * The avatar walks to each new live position instead of jumping: GPS fixes
 * (about one a second) and the simulator's steps arrive as points, the
 * avatar covers the gap at walking pace or faster, so a steady stream of
 * fixes reads as one continuous walk. A gap wider than `AVATAR_TELEPORT_METRES`
 * is a new pin (a QR, a confirmed work) or a GPS jump: the avatar is put there.
 */
export const AVATAR_WALK_SPEED = 1.4
/** Catch-up rate (1/s): the farther behind, the faster it walks. */
export const AVATAR_CATCH_UP = 4
export const AVATAR_TELEPORT_METRES = 4

/**
 * Carries a group to `point` as described above (the visitor's avatar on the
 * museum map, `WalkingAvatar`). Its position is driven per frame, never as a
 * prop: a prop would put it back on the target at every render. `heading`
 * is the yaw of the current movement (radians, as `atan2(dx, dz)`), or null
 * once it stands; the avatar reads it every frame to face the way it walks.
 *
 * Its own module so the motion is testable with `@react-three/test-renderer`
 * (tests/int/walk-to.int.spec.tsx) without the Pascal viewer.
 */
export function useWalkTo(point: Vec3) {
  const group = useRef<Group>(null)
  const heading = useRef<number | null>(null)
  const placed = useRef(false)
  // One query list, read every frame: matchMedia() itself would build a new
  // one 60 times a second.
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'))
  const [x, y, z] = point
  useFrame((_, delta) => {
    const avatar = group.current
    if (!avatar) return
    const dx = x - avatar.position.x
    const dz = z - avatar.position.z
    const distance = Math.hypot(dx, dz)
    if (placed.current && distance === 0) return
    if (
      !placed.current ||
      reducedMotion.matches ||
      distance > AVATAR_TELEPORT_METRES ||
      distance < 0.02
    ) {
      avatar.position.set(x, y, z)
      placed.current = true
      heading.current = null
      return
    }
    heading.current = Math.atan2(dx, dz)
    const step = Math.min(distance, Math.max(AVATAR_WALK_SPEED, distance * AVATAR_CATCH_UP) * delta)
    avatar.position.set(
      avatar.position.x + (dx / distance) * step,
      y,
      avatar.position.z + (dz / distance) * step,
    )
  })
  return { group, heading }
}
