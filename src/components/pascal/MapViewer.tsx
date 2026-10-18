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
import { museumPlugin } from '@/lib/pascal/museum-plugin'
import { Viewer } from '@pascal-app/viewer'
import { CameraControls, type CameraControlsImpl } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Box3, Sphere } from 'three'

/** Hosts the shared Pascal museum scene used by both editing and visitor flows. */
export function MapViewer({
  map,
  children,
  orbitEnabled = true,
  onSceneReadyChange,
  selectionManager = 'default',
  ...props
}: {
  map: ParsedBuildJson
  children?: React.ReactNode
  orbitEnabled?: boolean
  onSceneReadyChange?: (ready: boolean) => void
  selectionManager?: 'default' | 'custom'
} & BoxProps) {
  const setScene = useScene((state) => state.setScene)
  const controls = useRef<CameraControlsImpl>(null)
  const [loadedMap, setLoadedMap] = useState<ParsedBuildJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const handleSceneReadyChange = useCallback(
    (ready: boolean) => {
      onSceneReadyChange?.(ready)
      if (!ready || !controls.current) return
      const bounds = new Box3()
      // The site's horizon is presentation scenery, not the museum's bounds.
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
    },
    [onSceneReadyChange],
  )

  useEffect(() => {
    let cancelled = false
    setLoadError(null)

    void loadPlugin(builtinPlugin)
      .then(() => loadPlugin(museumPlugin))
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
      <Viewer selectionManager={selectionManager} onSceneReadyChange={handleSceneReadyChange}>
        <CameraControls ref={controls} makeDefault enabled={orbitEnabled} />
        {children}
      </Viewer>
    </Box>
  )
}
