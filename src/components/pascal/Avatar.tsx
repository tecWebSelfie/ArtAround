'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { deltaAngle } from 'maath/misc'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Vector3, type Group } from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

/** The male asset is authored at roughly human size (~1.7 m), so it needs no rescaling. */
const AVATAR_SCALE = 1
/** Source asset is approximately 1.7 m tall; the route sits at face height. */
export const AVATAR_FACE_HEIGHT = 1.7 * AVATAR_SCALE * 0.8

/** The model's front faces +Z, which is three.js's rotation.y = 0. */
const AVATAR_FORWARD_OFFSET = 0
/** Seconds the yaw spring takes to roughly catch up with the camera. */
const TURN_SMOOTH_TIME = 0.35
/**
 * Hysteresis on the remaining turn (radians): start stepping past ~6°, stop under
 * ~1°, so tiny camera moves don't make the avatar shuffle on the spot.
 */
const START_TURN = 0.1
const STOP_TURN = 0.02
/** Turning on the spot takes shorter steps than walking, so slow the Walk clip down. */
const TURN_WALK_TIME_SCALE = 0.6
const FADE_SECONDS = 0.25

const CLIPS = { idle: 'Armature|Idle', walk: 'Armature|Walk' } as const

const worldPosition = new Vector3()

/**
 * Visitor marker placed at the confirmed `at` position on the museum map.
 * It keeps turning to face the camera, playing the in-place Walk clip while it
 * turns and Idle once it faces the viewer. The clips are in place, so the
 * position stays exactly on the route start; only the yaw is driven by code.
 *
 * Memoized: it has no props, and re-rendering a cloned skinned GLTF on every
 * navigation-page render (directions, GPS progress) used to make it vanish.
 */
export const Avatar = memo(function Avatar() {
  const { scene, animations } = useGLTF('/models/AvatarMale.glb')
  // useGLTF caches one scene per URL; a skeleton-aware clone gives this marker
  // its own bones, so its mixer never animates another instance of the model.
  const model = useMemo(() => cloneSkinned(scene), [scene])
  const { actions } = useAnimations(animations, model)

  const yaw = useRef<Group>(null)
  const [turning, setTurning] = useState(false)
  const turningRef = useRef(false)

  // Cross-fade between Idle and Walk whenever the turning state flips.
  useEffect(() => {
    const action = actions[turning ? CLIPS.walk : CLIPS.idle]
    if (!action) return
    action.reset().setEffectiveTimeScale(turning ? TURN_WALK_TIME_SCALE : 1)
    action.fadeIn(FADE_SECONDS).play()
    return () => {
      action.fadeOut(FADE_SECONDS)
    }
  }, [actions, turning])

  useFrame(({ camera }, delta) => {
    const group = yaw.current
    if (!group) return
    // atan2(dx, dz) is the yaw that points the model's +Z towards the camera,
    // measured from the avatar's world position (its parent sits at the route start).
    group.getWorldPosition(worldPosition)
    const target =
      Math.atan2(camera.position.x - worldPosition.x, camera.position.z - worldPosition.z) +
      AVATAR_FORWARD_OFFSET
    // dampAngle takes the shortest way round, so crossing ±180° never spins the long way.
    easing.dampAngle(group.rotation, 'y', target, TURN_SMOOTH_TIME, delta)

    const remaining = Math.abs(deltaAngle(group.rotation.y, target))
    const next = turningRef.current ? remaining > STOP_TURN : remaining > START_TURN
    if (next !== turningRef.current) {
      // Only flips cross the React boundary; per-frame yaw stays in refs.
      turningRef.current = next
      setTurning(next)
    }
  })

  return (
    <group ref={yaw}>
      <primitive object={model} scale={AVATAR_SCALE} dispose={null} />
    </group>
  )
})

useGLTF.preload('/models/AvatarMale.glb')
