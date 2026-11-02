'use client'

import { Avatar, AVATAR_FACE_HEIGHT } from '@/components/pascal/Avatar'
import { MapViewer } from '@/components/pascal/MapViewer'
import { collectMuseumMarkers } from '@/lib/pascal/museum-plugin/markers-in-map'
import { museumNavigationPath, objectNavigationPoint } from '@/lib/pascal/navigation'
import { museumObjectId, type NavigationDestination } from '@/lib/tour-navigation'
import { emitter, sceneRegistry, useScene, type ItemEvent } from '@pascal-app/core'
import { Gltf } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import type { NavMesh, Vec3 } from 'navcat'
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { Line2 } from 'three/addons/lines/webgpu/Line2.js'
import { Line2NodeMaterial } from 'three/webgpu'
import { Box3, Vector3, type Object3D } from 'three'

/** A destination flag is drawn at hero-glTF scale (~1.3 m); keep it knee-high. */
const DESTINATION_FLAG_SCALE = 0.7

export type MuseumRoute = {
  path: Vec3[] | null
  start: Vec3 | null
  target: [number, number] | null
}

/** Plan centre [x, z] of a scene object, from its world bounds. */
function planCentre(object: Object3D): [number, number] {
  const centre = new Box3().setFromObject(object).getCenter(new Vector3())
  return [centre.x, centre.z]
}

/**
 * Connects Pascal's scene to tour semantics: clicks resolve by ItemNode asset ID,
 * while `at` / `to` / `service` / `exit` become navmesh positions for the
 * visitor's route. Services and entrances/exits are Pascal marker nodes, so the
 * route is resolved from their live meshes just like museum objects.
 */
export function MuseumMap({
  map,
  navMesh,
  currentObjectId,
  destination,
  onObjectClick,
  onRouteUnavailable,
  onStartEntranceChange,
  onRouteChange,
  progressPoint,
  ...props
}: ComponentProps<typeof MapViewer> & {
  navMesh?: NavMesh | null
  currentObjectId?: string | null
  destination?: NavigationDestination | null
  onObjectClick?: (id: string) => void
  onRouteUnavailable?: (unavailable: boolean) => void
  /** Reports the entrance the route started from, so the progress bar mirrors it. */
  onStartEntranceChange?: (entranceId: string | null) => void
  /**
   * Reports the resolved route so the page can build directions from it:
   * the path, its start, and the destination's own plan centre [x, z]
   * (the path ends beside the destination, not inside it).
   */
  onRouteChange?: (route: MuseumRoute | null) => void
  /** GPS progress: where the visitor is estimated to be along the route. */
  progressPoint?: Vec3 | null
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Pascal emits item clicks for every selectable node; the shared ID helper
    // filters these to museum objects, leaving walls and map geometry untouched.
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
  }, [onObjectClick])

  const route = useMemo(() => {
    if (!ready || !navMesh) return null
    const markers = collectMuseumMarkers(useScene.getState().nodes as Record<string, unknown>)

    // The map node stores the Payload object ID; resolve its live mesh so
    // navigation uses world-space bounds, including parent transforms.
    const point = (id: string | null | undefined) => {
      if (!id) return null
      const node = Object.values(useScene.getState().nodes).find(
        (node) => museumObjectId(node) === id,
      )
      const object = node && sceneRegistry.nodes.get(node.id)
      return object ? objectNavigationPoint(navMesh, object) : null
    }
    // Marker nodes are registered under their own id; a marker without a live
    // mesh (unplaced, or not rendered yet) simply has no routable point.
    const markerPoint = (nodeId: string) => {
      const object = sceneRegistry.nodes.get(nodeId)
      return object ? objectNavigationPoint(navMesh, object) : null
    }
    const toPoint = ({ id }: { id: string }) => markerPoint(id)
    const distance = (from: Vec3 | null, to: Vec3) =>
      from ? Math.hypot(from[0] - to[0], from[2] - to[2]) : 0
    /** Closest of the given markers, measured from the visitor's position. */
    const nearest = (ids: readonly string[], from: Vec3 | null) => {
      let best: { id: string; point: Vec3 } | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const id of ids) {
        const candidate = markerPoint(id)
        if (!candidate) continue
        const current = distance(from, candidate)
        if (current < bestDistance) {
          best = { id, point: candidate }
          bestDistance = current
        }
      }
      return best
    }

    const placedServices = markers.services.filter((node) => node.placed)
    const placedExits = markers.exitEntrances.filter((node) => node.placed)
    const placedEntrances = markers.exitEntrances.filter(
      (node) => node.placed && node.direction === 'entrance',
    )

    const reference = point(currentObjectId)
    // A service button routes to the closest instance of that type; spotlight
    // entries carry the exact node id and win over the "closest" fallback.
    const end = !destination
      ? null
      : destination.kind === 'object'
        ? point(destination.id)
        : destination.kind === 'service'
          ? placedServices.some((node) => node.id === destination.target)
            ? toPoint({ id: destination.target })
            : (nearest(
                placedServices
                  .filter((node) => node.service === destination.target)
                  .map((node) => node.id),
                reference,
              )?.point ?? null)
          : placedExits.some((node) => node.id === destination.target)
            ? toPoint({ id: destination.target })
            : (nearest(
                placedExits.map((node) => node.id),
                reference,
              )?.point ?? null)

    // Without a confirmed `at`, the tour starts at an entrance: the closest one
    // to where the visitor is heading, so shared links stay as short as
    // possible. The origin is derived, never written back to the URL.
    const entrance = reference
      ? null
      : nearest(
          placedEntrances.map((node) => node.id),
          end,
        )
    const start = reference ?? entrance?.point ?? null
    // Directions say which side an object stands on, so they need the object's
    // own centre; markers (services, exits) are small enough to be "ahead".
    const targetNode =
      destination?.kind === 'object'
        ? Object.values(useScene.getState().nodes).find(
            (node) => museumObjectId(node) === destination.id,
          )
        : null
    const targetObject = targetNode && sceneRegistry.nodes.get(targetNode.id)
    return {
      start,
      end,
      target: targetObject ? planCentre(targetObject) : null,
      startEntranceId: reference ? null : (entrance?.id ?? null),
      path: start && end ? museumNavigationPath(navMesh, start, end) : null,
    }
  }, [ready, navMesh, currentObjectId, destination])

  useEffect(() => {
    onRouteChange?.(route ? { path: route.path, start: route.start, target: route.target } : null)
  }, [route, onRouteChange])

  const startEntranceId = route?.startEntranceId ?? null
  useEffect(() => {
    onStartEntranceChange?.(startEntranceId)
  }, [startEntranceId, onStartEntranceChange])

  useEffect(() => {
    onRouteUnavailable?.(Boolean(route?.start && route.end && !route.path))
  }, [route, onRouteUnavailable])

  return (
    <MapViewer map={map} {...props} selectionManager="custom" onSceneReadyChange={setReady}>
      {route?.start && (
        // This avatar marks the last position explicitly confirmed by the visitor,
        // or the derived entrance origin before any position is confirmed.
        <group position={route.start}>
          <Suspense fallback={null}>
            <Avatar />
          </Suspense>
        </group>
      )}
      {route?.end && (
        // The flag marks the chosen destination (object, service, or exit).
        <group position={route.end}>
          <Suspense fallback={null}>
            <Gltf src="/models/flag.glb" scale={DESTINATION_FLAG_SCALE} />
          </Suspense>
        </group>
      )}
      {route?.path && route.path.length > 1 && <NavigationPath points={route.path} />}
      {progressPoint && (
        // GPS estimate snapped onto the route: a soft dot, distinct from the
        // avatar, which stays on the last explicitly confirmed position.
        <mesh
          name="museum-navigation-progress"
          position={[progressPoint[0], progressPoint[1] + 0.05, progressPoint[2]]}
          renderOrder={1001}
        >
          <sphereGeometry args={[0.35, 24, 16]} />
          <meshBasicMaterial color="#228be6" transparent opacity={0.85} depthTest={false} />
        </mesh>
      )}
    </MapViewer>
  )
}

/** Pascal uses WebGPURenderer; Drei's WebGL LineMaterial cannot render here. */
const PathLine = extend(Line2)
const PathGeometry = extend(LineGeometry)
const PathMaterial = extend(Line2NodeMaterial)

function NavigationPath({ points }: { points: [number, number, number][] }) {
  const geometry = useRef<LineGeometry>(null)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    // A URL-only destination change keeps this geometry mounted. Update its
    // vertices explicitly: onUpdate alone doesn't react to a changed callback.
    // Show guidance at 80% of the avatar's displayed height, near its face.
    geometry.current?.setPositions(points.flatMap(([x, y, z]) => [x, y + AVATAR_FACE_HEIGHT, z]))
    invalidate()
  }, [points, invalidate])

  return (
    <PathLine name="museum-navigation-path" renderOrder={1000}>
      <PathGeometry ref={geometry} />
      <PathMaterial color="#228be6" linewidth={5} depthTest={false} depthWrite={false} />
    </PathLine>
  )
}
