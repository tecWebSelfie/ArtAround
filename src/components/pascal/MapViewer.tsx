'use client'

import { loadPlugin } from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { Viewer } from '@pascal-app/viewer'

export async function MapViewer() {
  await loadPlugin(builtinPlugin)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Viewer>
        <mesh>
          {/* Defines the shape (width, height, depth) */}
          <boxGeometry args={[1, 1, 1]} />
          {/* Defines the surface appearance */}
          <meshStandardMaterial color="hotpink" />
        </mesh>
      </Viewer>
    </div>
  )
}
