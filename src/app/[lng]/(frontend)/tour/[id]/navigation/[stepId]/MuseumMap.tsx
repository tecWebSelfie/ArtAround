'use client'

import { Avatar } from '@/components/pascal/Avatar'
import { MapViewer } from '@/components/pascal/MapViewer'
import { museumNavigationPath, objectNavigationPoint } from '@/lib/pascal/navigation'
import { museumObjectId } from '@/lib/tour-navigation'
import { emitter, sceneRegistry, useScene, type ItemEvent } from '@pascal-app/core'
import { extend } from '@react-three/fiber'
import type { NavMesh } from 'navcat'
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentProps } from 'react'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { Line2 } from 'three/addons/lines/webgpu/Line2.js'
import { Line2NodeMaterial } from 'three/webgpu'

const MuseumWalkthrough = lazy(() => import('@/components/pascal/MuseumWalkthrough'))

/**
 * Connects Pascal's scene to tour semantics: clicks resolve by ItemNode asset ID,
 * `at`/`to` become navmesh positions, and first-person controls stay optional.
 */
export function MuseumMap({
  map,
  navMesh,
  currentObjectId,
  destinationObjectId,
  firstPerson = false,
  onExitFirstPerson,
  onObjectClick,
  onRouteUnavailable,
  ...props
}: ComponentProps<typeof MapViewer> & {
  navMesh?: NavMesh | null
  currentObjectId?: string | null
  destinationObjectId?: string | null
  firstPerson?: boolean
  onExitFirstPerson: () => void
  onObjectClick?: (id: string) => void
  onRouteUnavailable?: (unavailable: boolean) => void
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Pascal emits item clicks for every selectable node; the shared ID helper
    // filters these to museum objects, leaving walls and map geometry untouched.
    if (firstPerson) return
    const select = ({ node, stopPropagation }: ItemEvent) => {
      const id = museumObjectId(node)
      if (id) {
        stopPropagation()
        onObjectClick?.(id)
      }
    }
    emitter.on('item:click', select)
    return () => {
      emitter.off('item:click', select)
    }
  }, [firstPerson, onObjectClick])

  const route = useMemo(() => {
    if (!ready || !navMesh) return null
    const point = (id: string | null | undefined) => {
      if (!id) return null
      // The map node stores the Payload object ID; resolve its live mesh so
      // navigation uses world-space bounds, including parent transforms.
      const node = Object.values(useScene.getState().nodes).find(
        (node) => museumObjectId(node) === id,
      )
      const object = node && sceneRegistry.nodes.get(node.id)
      return object ? objectNavigationPoint(navMesh, object) : null
    }
    const start = point(currentObjectId)
    const end = point(destinationObjectId)
    return { start, end, path: start && end ? museumNavigationPath(navMesh, start, end) : null }
  }, [ready, navMesh, currentObjectId, destinationObjectId, map])

  useEffect(() => {
    onRouteUnavailable?.(Boolean(ready && currentObjectId && destinationObjectId && !route?.path))
  }, [ready, currentObjectId, destinationObjectId, route, onRouteUnavailable])

  return (
    <MapViewer
      map={map}
      {...props}
      selectionManager="custom"
      orbitEnabled={!firstPerson}
      onSceneReadyChange={setReady}
    >
      {route?.start && (
        // This avatar marks the last position explicitly confirmed by the visitor.
        <group position={route.start}>
          <Suspense fallback={null}>
            <Avatar />
          </Suspense>
        </group>
      )}
      {route?.end && (
        // The ring marks an optional side destination; without `to`, the tour stop is used.
        <mesh
          position={[route.end[0], route.end[1] + 0.08, route.end[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3, 0.45, 32]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      )}
      {route?.path && route.path.length > 1 && <NavigationPath points={route.path} />}
      {ready && firstPerson && (
        <Suspense fallback={null}>
          <MuseumWalkthrough onExit={onExitFirstPerson} />
        </Suspense>
      )}
    </MapViewer>
  )
}

/** Pascal uses WebGPURenderer; Drei's WebGL LineMaterial cannot render here. */
const PathLine = extend(Line2)
const PathGeometry = extend(LineGeometry)
const PathMaterial = extend(Line2NodeMaterial)

function NavigationPath({ points }: { points: [number, number, number][] }) {
  return (
    <PathLine>
      <PathGeometry
        // Lift the line slightly above the navmesh to avoid z-fighting with the floor.
        onUpdate={(geometry) =>
          geometry.setPositions(points.flatMap(([x, y, z]) => [x, y + 0.06, z]))
        }
      />
      <PathMaterial color="#2563eb" linewidth={4} />
    </PathLine>
  )
}
