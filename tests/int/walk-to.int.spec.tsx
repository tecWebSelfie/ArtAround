// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Vec3 } from 'navcat'
import { useFrame } from '@react-three/fiber'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AVATAR_CATCH_UP,
  AVATAR_TELEPORT_METRES,
  AVATAR_WALK_SPEED,
  useWalkTo,
} from '@/components/pascal/use-walk-to'

/**
 * The visitor's avatar walking on the museum map (`useWalkTo`, used by
 * `WalkingAvatar`), driven through React Three Fiber for real by
 * `@react-three/test-renderer`: no WebGL, no browser, a real scene graph and
 * frame loop advanced by hand (`advanceFrames`). The avatar model itself is
 * left out (a plain group), so the spec covers only the motion.
 */
// React's act() warns unless the environment says it supports it; Testing
// Library sets this flag itself, the three test renderer does not.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let heading: number | null | undefined
let mounted: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>> | undefined

function Walker({ point }: { point: Vec3 }) {
  const { group, heading: yaw } = useWalkTo(point)
  // Subscribed after the hook's own frame callback, so it reads this frame's yaw.
  useFrame(() => {
    heading = yaw.current
  })
  return <group ref={group} name="avatar" />
}

async function renderWalker(point: Vec3) {
  const renderer = await ReactThreeTestRenderer.create(<Walker point={point} />)
  mounted = renderer
  const avatar = () => renderer.scene.findByProps({ name: 'avatar' }).instance
  return { renderer, avatar }
}

afterEach(async () => {
  await mounted?.unmount()
  mounted = undefined
  vi.unstubAllGlobals()
  heading = undefined
})

describe('useWalkTo', () => {
  it('puts the avatar on its first point at once', async () => {
    const { renderer, avatar } = await renderWalker([3, 0, 2])
    await renderer.advanceFrames(1, 1 / 60)
    expect(avatar().position.toArray()).toEqual([3, 0, 2])
    expect(heading).toBeNull()
  })

  it('walks a short gap over several frames, facing the way it goes', async () => {
    const { renderer, avatar } = await renderWalker([0, 0, 0])
    await renderer.advanceFrames(1, 1 / 60)

    // 2 m ahead along +x: under the teleport distance, so it walks.
    await renderer.update(<Walker point={[2, 0, 0]} />)
    await renderer.advanceFrames(1, 0.1)
    const afterOne = avatar().position.x
    expect(afterOne).toBeGreaterThan(0)
    expect(afterOne).toBeLessThan(2)
    // Catch-up pace: 2 m × 4/s × 0.1 s, faster than plain walking speed.
    expect(afterOne).toBeCloseTo(Math.max(AVATAR_WALK_SPEED, 2 * AVATAR_CATCH_UP) * 0.1)
    // atan2(dx, dz) for +x is a quarter turn.
    expect(heading).toBeCloseTo(Math.PI / 2)

    // A couple of seconds later it stands on the target and stops turning.
    await renderer.advanceFrames(120, 1 / 60)
    expect(avatar().position.x).toBeCloseTo(2)
    expect(heading).toBeNull()
  })

  it('jumps across a gap wider than the teleport distance', async () => {
    const { renderer, avatar } = await renderWalker([0, 0, 0])
    await renderer.advanceFrames(1, 1 / 60)
    await renderer.update(<Walker point={[0, 0, AVATAR_TELEPORT_METRES + 1]} />)
    await renderer.advanceFrames(1, 1 / 60)
    expect(avatar().position.toArray()).toEqual([0, 0, AVATAR_TELEPORT_METRES + 1])
  })

  it('jumps instead of walking when the visitor asks for reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    const { renderer, avatar } = await renderWalker([0, 0, 0])
    await renderer.advanceFrames(1, 1 / 60)
    await renderer.update(<Walker point={[1, 0, 0]} />)
    await renderer.advanceFrames(1, 1 / 60)
    expect(avatar().position.toArray()).toEqual([1, 0, 0])
  })
})
