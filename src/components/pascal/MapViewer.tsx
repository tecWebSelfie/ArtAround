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
import { RenderErrorBoundary } from '@/components/RenderErrorBoundary'
import { loadableMap } from '@/lib/pascal/loadable-map'
import { loadMuseumPlugins } from '@/lib/pascal/plugins'
import { useViewer, Viewer, type HoverStyles } from '@pascal-app/viewer'
import { CameraControls, type CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box3, Sphere, Vector3 } from 'three'

/** How the map is drawn: in perspective, or straight from above as a plan. */
export type MapView = '3d' | '2d'

/** Hosts the shared Pascal museum scene used by both editing and visitor flows. */
export function MapViewer({
  map,
  children,
  orbitEnabled = true,
  onSceneReadyChange,
  selectionManager = 'default',
  renderPaused = false,
  hoverStyles,
  view = '3d',
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
  /**
   * How Pascal draws its hover outline (the post-processing pass the editor
   * uses for hovered nodes). The visitor map reuses it to outline its works:
   * see `WorkOutlines` in the navigation map.
   */
  hoverStyles?: HoverStyles
  /** `2d`: an orthographic plan seen from above, north up; zoom and pan only. */
  view?: MapView
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
      // Shown once ready, framed or not: without camera controls there is
      // nothing to frame, and a canvas kept hidden would hide the fallback.
      setFramedMap(map)
      if (!controls.current) return
      frameMuseum(controls.current, view, false)
    },
    [onSceneReadyChange, map, view],
  )

  useEffect(() => {
    let cancelled = false

    // Once per page: this effect runs again for every new `map` object, and
    // Pascal rejects a plugin loaded twice (src/lib/pascal/plugins.ts).
    void loadMuseumPlugins()
      .then(() => {
        if (cancelled) return
        // Legacy markers and asset URLs repaired (setScene drops root markers).
        const scene = loadableMap(map)
        const nodes: Record<AnyNodeId, AnyNode> = {}
        // Plugin-registered kinds (e.g. museum service markers) are not members
        // of the `AnyNode` union, so `AnyNode.parse` rejects them. Materialize
        // their registered defaults first, then keep `AnyNode.parse` for the
        // built-in kinds and fall back to the stored node for plugin kinds.
        for (const [id, value] of Object.entries(materializeRegisteredNodeDefaults(scene.nodes))) {
          const node = AnyNode.safeParse(value)
          nodes[id as AnyNodeId] = (node.success ? node.data : value) as AnyNode
        }
        setScene(nodes, scene.rootNodeIds as AnyNodeId[], {
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
      {/* Without WebGL the viewer throws while its canvas mounts: only the
          map gives way, so a tour keeps its text, audio and controls. The
          boundary sits outside the fading box, which never shows then. */}
      <RenderErrorBoundary
        fallback={<div role="alert">{t('The 3D view is not available on this device.')}</div>}
      >
        {/* Hidden, not unmounted, until framed; then a short fade (none when
            the visitor asks for reduced motion). */}
        <Box
          className={`size-full motion-safe:transition-opacity motion-safe:duration-300 ${framedMap === map ? 'opacity-100' : 'opacity-0'}`}
        >
          <Viewer
            selectionManager={selectionManager}
            onSceneReadyChange={handleSceneReadyChange}
            renderPaused={renderPaused}
            hoverStyles={hoverStyles}
          >
            <CameraControls ref={controls} makeDefault enabled={orbitEnabled} />
            <ViewMode view={view} />
            {children}
          </Viewer>
        </Box>
      </RenderErrorBoundary>
    </Box>
  )
}

/**
 * Switches Pascal's camera (`useViewer` → `cameraMode`) and the controls'
 * limits for `view`. The plan locks the camera straight above the museum,
 * north up, so dragging pans and pinching zooms; perspective gets its orbit
 * back. A switch frames the whole museum again. Pascal's camera mode is
 * global, so leaving the map puts perspective back for the next viewer (the
 * map editor).
 */
function ViewMode({ view }: { view: MapView }) {
  // A new camera brings new controls (drei rebuilds them for it).
  const controls = useThree((state) => state.controls) as CameraControlsImpl | null
  useEffect(() => {
    useViewer.getState().setCameraMode(view === '2d' ? 'orthographic' : 'perspective')
  }, [view])
  useEffect(() => () => useViewer.getState().setCameraMode('perspective'), [])
  // The view the controls were last framed for: the first frame is the
  // scene-ready handler's, before the canvas shows; this reframes on a switch.
  const framedFor = useRef<{ controls: CameraControlsImpl; view: MapView } | null>(null)
  useEffect(() => {
    if (!controls) return
    lockToView(controls, view)
    const previous = framedFor.current
    framedFor.current = { controls, view }
    if (!previous || (previous.view === view && previous.controls === controls)) return
    frameMuseum(controls, view, !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [controls, view])
  return null
}

/** The plan sits straight above the museum, north up; perspective orbits freely. */
function lockToView(controls: CameraControlsImpl, view: MapView) {
  const plan = view === '2d'
  controls.minPolarAngle = 0
  controls.maxPolarAngle = plan ? 0 : Math.PI
  controls.minAzimuthAngle = plan ? 0 : -Infinity
  controls.maxAzimuthAngle = plan ? 0 : Infinity
}

/** The whole museum in view: from a corner in perspective, from above as a plan. */
function frameMuseum(controls: CameraControlsImpl, view: MapView, smooth: boolean) {
  const bounds = museumBounds()
  if (bounds.isEmpty()) return
  lockToView(controls, view)
  if (view === '2d') {
    const centre = bounds.getCenter(new Vector3())
    void controls.setLookAt(centre.x, centre.y + 50, centre.z, centre.x, centre.y, centre.z, false)
    void controls.fitToBox(bounds, smooth, {
      paddingTop: 1,
      paddingBottom: 1,
      paddingLeft: 1,
      paddingRight: 1,
    })
    return
  }
  void controls.setLookAt(20, 20, 20, 0, 0, 0, false)
  const sphere = bounds.getBoundingSphere(new Sphere())
  sphere.radius *= 1.1
  void controls.fitToSphere(sphere, smooth)
}

/** The museum's extent: every registered node but the site's horizon scenery. */
function museumBounds() {
  const bounds = new Box3()
  for (const node of Object.values(useScene.getState().nodes)) {
    if (node.type === 'site') continue
    const object = sceneRegistry.nodes.get(node.id)
    if (object) bounds.expandByObject(object)
  }
  return bounds
}
