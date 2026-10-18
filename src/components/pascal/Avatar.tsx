'use client'

import { Clone, useGLTF } from '@react-three/drei'

/** Visitor marker placed at the confirmed `at` position on the museum map. */
export function Avatar() {
  const { scene } = useGLTF('/models/Avatar.glb')
  // This asset is authored at 4.5 m tall; use a human-sized marker in the museum.
  return <Clone object={scene} scale={0.38} dispose={null} />
}
