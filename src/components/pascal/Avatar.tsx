'use client'

import { Clone, useGLTF } from '@react-three/drei'
import { memo } from 'react'

const AVATAR_SCALE = 0.38
/** Source asset is approximately 4.5 m tall; the route sits at face height. */
export const AVATAR_FACE_HEIGHT = 4.5 * AVATAR_SCALE * 0.8

/**
 * Visitor marker placed at the confirmed `at` position on the museum map.
 * Memoized: it has no props, and re-rendering the cloned skinned GLTF on
 * every navigation-page render (directions, GPS progress) made it vanish.
 */
export const Avatar = memo(function Avatar() {
  const { scene } = useGLTF('/models/Avatar.glb')
  // This asset is authored at 4.5 m tall; use a human-sized marker in the museum.
  return <Clone object={scene} scale={AVATAR_SCALE} dispose={null} />
})
