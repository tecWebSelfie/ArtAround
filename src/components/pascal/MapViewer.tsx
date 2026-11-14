'use client'

import '@/lib/gltf-decoder'

import { Box, BoxProps } from '@mantine/core'
import {
  AnyNode,
  materializeRegisteredNodeDefaults,
  sceneRegistry,
  useScene,
  type AnyNodeId,
  type ParsedBuildJson,
} from '@pascal-app/core'
import { loadMuseumPlugins } from '@/lib/pascal/plugins'
import { Viewer } from '@pascal-app/viewer'
import { CameraControls, type CameraControlsImpl } from '@react-three/drei'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box3, Sphere } from 'three'

/** Hosts the shared Pascal museum scene used by both editing and visitor flows. */
export function MapViewer({
  map,
  children,
  orbitEnabled = true,
  onSceneReadyChange,
  selectionManager = 'default',
  renderPaused = false,
  ...props
}: {
  map: ParsedBuildJson
  children?: React.ReactNode
  orbitEnabled?: boolean
  onSceneReadyChange?: (ready: boolean) => void
  selectionManager?: 'default' | 'custom'
  /**
   * Stops drawing frames while the map is fully covered (the QR scanner's
   * full-screen camera), keeping the scene mounted to resume as it was. A
   * covered map still rendering its post-processing starves the page: on a
   * slow device the scanner then gets too few frames to decode a code.
   */
  renderPaused?: boolean
} & BoxProps) {
  const { t } = useTranslation()
  const setScene = useScene((state) => state.setScene)
  const controls = useRef<CameraControlsImpl>(null)
  const [loadedMap, setLoadedMap] = useState<ParsedBuildJson | null>(null)
  // The map whose load failed: an error for an earlier map clears itself
  // when `map` changes, with no reset inside the effect.
  const [failedMap, setFailedMap] = useState<ParsedBuildJson | null>(null)
  // The map framed by the camera below. Until then the canvas stays hidden:
  // the scene draws as it streams in, from the camera's default spot next to
  // the origin, so the first frames were a close-up of one room (or the
  // visitor's character) that jumped to the whole museum once ready.
  const [framedMap, setFramedMap] = useState<ParsedBuildJson | null>(null)
  const handleSceneReadyChange = useCallback(
    (ready: boolean) => {
      onSceneReadyChange?.(ready)
      if (!ready) return
      // Shown once ready, framed or not: without camera controls (no WebGL,
      // the viewer's own fallback) there is nothing to frame, and a canvas
      // kept hidden would hide that fallback too.
      setFramedMap(map)
      if (!controls.current) return
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
    [onSceneReadyChange, map],
  )

  useEffect(() => {
    let cancelled = false

    // Once per page: this effect runs again for every new `map` object, and
    // Pascal rejects a plugin loaded twice (src/lib/pascal/plugins.ts).
    void loadMuseumPlugins()
      .then(() => {
        if (cancelled) return
        const nodes: Record<AnyNodeId, AnyNode> = {}
        // Plugin-registered kinds (e.g. museum service markers) are not members
        // of the `AnyNode` union, so `AnyNode.parse` rejects them. Materialize
        // their registered defaults first, then keep `AnyNode.parse` for the
        // built-in kinds and fall back to the stored node for plugin kinds.
        for (const [id, value] of Object.entries(materializeRegisteredNodeDefaults(map.nodes))) {
          const node = AnyNode.safeParse(value)
          nodes[id as AnyNodeId] = (node.success ? node.data : value) as AnyNode
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
        if (cancelled) return
        console.error('MapViewer: the map could not load', error)
        setFailedMap(map)
      })

    return () => {
      cancelled = true
    }
  }, [map, setScene])

  if (failedMap === map)
    return <div role="alert">{t('The map could not load. Reload the page to try again.')}</div>
  if (loadedMap !== map) return <div role="status">{t('Loading map…')}</div>

  return (
    <Box {...props}>
      {/* Hidden, not unmounted, until framed; then a short fade (none when
          the visitor asks for reduced motion). */}
      <Box
        className={`size-full motion-safe:transition-opacity motion-safe:duration-300 ${framedMap === map ? 'opacity-100' : 'opacity-0'}`}
      >
        <Viewer
          selectionManager={selectionManager}
          onSceneReadyChange={handleSceneReadyChange}
          renderPaused={renderPaused}
        >
          <CameraControls ref={controls} makeDefault enabled={orbitEnabled} />
          {children}
        </Viewer>
      </Box>
    </Box>
  )
}
