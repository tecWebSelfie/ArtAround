'use client'

import { useAnimations, useGLTF } from '@react-three/drei'

export function Avatar({}: {}) {
  const { scene, animations } = useGLTF('/public/avatar.glb')
  const { actions, names } = useAnimations(animations, scene)

  return <primitive object={scene} />
}
