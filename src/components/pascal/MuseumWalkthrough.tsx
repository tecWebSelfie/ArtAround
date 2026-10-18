'use client'

import { FirstPersonControls, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * Adapts the tour's optional first-person button to Pascal's built-in controls.
 * Pascal owns input, spawn selection, and BVH collisions; cleanup restores the
 * map camera so the tour's normal top-down exploration resumes smoothly.
 */
export default function MuseumWalkthrough({ onExit }: { onExit: () => void }) {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    // Keep the pre-walk view so leaving this mode doesn't alter the confirmed
    // object position (`at`) or strand the visitor in the first-person camera.
    const position = camera.position.clone()
    const quaternion = camera.quaternion.clone()
    useEditor.getState().setFirstPersonMovementMode('walk')
    useEditor.getState().setFirstPersonMode(true)
    useViewer.getState().setWalkthroughMode(true)
    const unsubscribe = useEditor.subscribe((state) => {
      if (!state.isFirstPersonMode) onExit()
    })
    return () => {
      unsubscribe()
      useEditor.getState().setFirstPersonMode(false)
      useViewer.getState().setWalkthroughMode(false)
      camera.position.copy(position)
      camera.quaternion.copy(quaternion)
      camera.updateMatrixWorld()
    }
  }, [camera, onExit])
  return <FirstPersonControls />
}
