'use client'

import '@/lib/gltf-decoder'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { deltaAngle } from 'maath/misc'
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Vector3, type Group, type Material, type Mesh } from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'

/**
 * The male asset is authored at human size (~1.7 m, unscaled) and faces +Z
 * (three.js's rotation.y = 0). The route line sits at face height.
 */
export const AVATAR_FACE_HEIGHT = 1.7 * 0.8

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
 * Opacity of the "ghost" avatar: a start the visitor has not confirmed (an
 * entrance guessed for a route preview). Faint enough to read as a
 * suggestion, solid enough to find on the plan.
 */
const GHOST_OPACITY = 0.4

/**
 * The ghost's translucent copy of each of the model's materials, made once
 * and shared by every ghost (the model's materials are themselves cached by
 * useGLTF), so fading never builds a new GPU pipeline per avatar.
 */
const fadedCopies = new WeakMap<Material, Material>()
function fadedCopy(material: Material) {
  let copy = fadedCopies.get(material)
  if (!copy) {
    copy = material.clone()
    copy.transparent = true
    copy.opacity = GHOST_OPACITY
    // Without depth writes the faded body never hides its own far side in
    // patches; the route line is drawn over it anyway.
    copy.depthWrite = false
    fadedCopies.set(material, copy)
  }
  return copy
}

/**
 * Visitor marker placed at the visitor's live position on the museum map.
 * Standing still, it keeps turning to face the camera, playing the in-place
 * Walk clip while it turns and Idle once it faces the viewer. While its
 * parent carries it to a new position (`heading` set, in radians, the yaw
 * of the movement), it faces the way it goes and keeps walking. The clips
 * are in place: the parent moves it, only the yaw is driven here.
 *
 * Memoized: it has no props, and re-rendering a cloned skinned GLTF on every
 * navigation-page render (directions, GPS progress) used to make it vanish.
 */
export const Avatar = memo(function Avatar({
  heading,
  ghost = false,
}: {
  /** Yaw of the current movement, or null when standing (read every frame). */
  heading?: RefObject<number | null>
  /** Drawn translucent: a guessed start, not the visitor's confirmed position. */
  ghost?: boolean
}) {
  const { scene, animations } = useGLTF('/models/AvatarMale.glb')
  // useGLTF caches one scene per URL; a skeleton-aware clone gives this marker
  // its own bones, so its mixer never animates another instance of the model.
  const model = useMemo(() => cloneSkinned(scene), [scene])
  // The clone shares the cached materials: a ghost swaps in faded copies
  // (shared by every ghost, see `fadedCopy`) and back, keeping the skeleton
  // and its animation running instead of building a new model.
  useEffect(() => {
    model.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const original = (mesh.userData.solidMaterial ??= mesh.material) as Mesh['material']
      mesh.material = !ghost
        ? original
        : Array.isArray(original)
          ? original.map(fadedCopy)
          : fadedCopy(original)
    })
  }, [model, ghost])
  const { actions } = useAnimations(animations, model)

  const yaw = useRef<Group>(null)
  const [turning, setTurning] = useState(false)

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
    const walking = heading?.current ?? null
    const target =
      walking ??
      Math.atan2(camera.position.x - worldPosition.x, camera.position.z - worldPosition.z)
    // dampAngle takes the shortest way round, so crossing ±180° never spins the long way.
    easing.dampAngle(group.rotation, 'y', target, TURN_SMOOTH_TIME, delta)

    const remaining = Math.abs(deltaAngle(group.rotation.y, target))
    // useFrame always runs the latest callback, so `turning` is current here.
    // Only flips cross the React boundary; the per-frame yaw stays on the group.
    const next = walking !== null || (turning ? remaining > STOP_TURN : remaining > START_TURN)
    if (next !== turning) setTurning(next)
  })

  return (
    <group ref={yaw}>
      <primitive object={model} dispose={null} />
    </group>
  )
})

useGLTF.preload('/models/AvatarMale.glb')
