'use client'

import { Box, BoxProps } from '@mantine/core'
import {
  AnyNode,
  loadPlugin,
  sceneRegistry,
  useScene,
  type AnyNodeId,
  type ParsedBuildJson,
} from '@pascal-app/core'
import { builtinPlugin } from '@pascal-app/nodes'
import { Viewer } from '@pascal-app/viewer'
import { CameraControls, type CameraControlsImpl } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { Box3, Sphere } from 'three'

export function MapViewer({
  map,
  children,
  ...props
}: { map: ParsedBuildJson; children?: React.ReactNode } & BoxProps) {
  const setScene = useScene((state) => state.setScene)
  const controls = useRef<CameraControlsImpl>(null)
  const [loadedMap, setLoadedMap] = useState<ParsedBuildJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    void loadPlugin(builtinPlugin)
      .then(() => {
        if (cancelled) return
        const nodes: Record<AnyNodeId, AnyNode> = {}
        for (const value of Object.values(map.nodes)) {
          const node = AnyNode.parse(value)
          nodes[node.id] = node
        }
        setScene(nodes, map.rootNodeIds as AnyNodeId[], {
          collections: map.collections,
          materials: map.materials,
          installedPlugins: map.installedPlugins,
          hasExplicitPluginInstallState: map.installedPlugins !== undefined,
        })
        setLoadedMap(map)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load the map')
        }
      })

    return () => {
      cancelled = true
    }
  }, [map, setScene])

  if (loadError) return <div role="alert">{loadError}</div>
  if (loadedMap !== map) return <div>Loading...</div>

  return (
    <Box {...props}>
      <Viewer
        onSceneReadyChange={(ready) => {
          if (!ready || !controls.current) return
          const bounds = new Box3()
          // The site's horizon plane is presentation scenery; framing it would
          // place the camera so far away that the museum becomes invisible.
          for (const node of Object.values(useScene.getState().nodes)) {
            if (node.type === 'site') continue
            const object = sceneRegistry.nodes.get(node.id)
            if (object) bounds.expandByObject(object)
          }
          if (!bounds.isEmpty()) {
            void controls.current.setLookAt(20, 20, 20, 0, 0, 0, false)
            const sphere = bounds.getBoundingSphere(new Sphere())
            sphere.radius *= 1.1
            void controls.current.fitToSphere(sphere, false)
          }
        }}
      >
        <CameraControls ref={controls} makeDefault />
        {children}
      </Viewer>
    </Box>
  )
}
