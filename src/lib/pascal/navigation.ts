import {
  createFindNearestPolyResult,
  DEFAULT_QUERY_FILTER,
  findNearestPoly,
  findPath,
  FindPathResultFlags,
  type NavMesh,
  type Vec3,
} from 'navcat'
import { Box3, Vector3, type Object3D } from 'three'

// These adapters connect Pascal scene geometry to the saved navmesh used by tour navigation.
/** Use world bounds and the base of the exhibit, never its local transform or roof. */
export function objectNavigationPoint(mesh: NavMesh, object: Object3D): Vec3 | null {
  object.updateWorldMatrix(true, true)
  const bounds = new Box3().setFromObject(object)
  if (bounds.isEmpty()) return null
  const center = bounds.getCenter(new Vector3())
  const nearest = findNearestPoly(
    createFindNearestPolyResult(),
    mesh,
    [center.x, bounds.min.y, center.z],
    [(bounds.max.x - bounds.min.x) / 2 + 1, 0.6, (bounds.max.z - bounds.min.z) / 2 + 1],
    DEFAULT_QUERY_FILTER,
  )
  return nearest.success ? nearest.position : null
}

/**
 * A route from `start` to `end`: its corner points and the navmesh polygons
 * it crosses (the corridor `src/lib/live-route.ts` follows as the visitor
 * walks). A partial route must not be presented as reaching the destination.
 */
export function museumNavigationRoute(mesh: NavMesh, start: Vec3, end: Vec3) {
  const result = findPath(mesh, start, end, [0.5, 0.6, 0.5], DEFAULT_QUERY_FILTER)
  if (!result.success || !(result.flags & FindPathResultFlags.COMPLETE_PATH)) return null
  return {
    points: result.path.map(({ position }) => position),
    nodes: result.nodePath?.path ?? [],
    start: result.startPosition,
  }
}

/** The corner points of `museumNavigationRoute`, for drawing and directions. */
export function museumNavigationPath(mesh: NavMesh, start: Vec3, end: Vec3): Vec3[] | null {
  return museumNavigationRoute(mesh, start, end)?.points ?? null
}
