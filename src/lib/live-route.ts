import type { PolygonPoint2D } from '@pascal-app/core'
import {
  createFindNearestPolyResult,
  DEFAULT_QUERY_FILTER,
  findNearestPoly,
  moveAlongSurface,
  type NavMesh,
  type NodeRef,
  type Vec3,
} from 'navcat'
import { pathCorridor } from 'navcat/blocks'
import { museumNavigationRoute } from './pascal/navigation'

/**
 * The visitor's live position on the navmesh and the route still ahead of it.
 *
 * Tour navigation keeps two positions apart:
 * - the pinned one (`at` in the URL, or the entrance before any): set only by
 *   an explicit act (a QR "I'm here", "Set as my position", arriving, a stop
 *   completed, a shared link) and the reference GPS movement is measured from;
 * - the live one: the pin moved by the GPS (real or simulated) since it was
 *   set. The avatar stands there and the route leaves from there.
 *
 * The route is not searched again at every fix ("Pacman" wayfinding, as
 * indoor SDKs do it). It is followed as a navmesh path corridor (navcat's
 * `pathCorridor`, Detour's agent corridor): the polygons the route crosses.
 * Each live position moves the corridor's start along the surface, eating the
 * polygons walked and taking in the ones stepped back into; the line drawn is
 * string-pulled from the live position through what is left. A new route is
 * searched only when the live position can't be reached from the corridor
 * along the surface (a wall in between: the visitor went another way, or a
 * GPS jump). Directions therefore keep their steps while the visitor follows
 * them, even sideways across a room.
 */

/** Search box around a GPS estimate for the closest walkable point (metres). */
const SNAP_EXTENTS: Vec3 = [4, 2, 4]

/**
 * How far (metres, in plan) the corridor's walk may end from the live
 * position and still count as "the same way": farther, a wall stood between
 * them and the route is searched again from the live position.
 */
const CORRIDOR_SLACK = 0.5

/** At most this many corners are drawn ahead (a museum route has a handful). */
const MAX_CORNERS = 64

/**
 * The estimate (plan [x, z], at the pinned floor height) moved onto the
 * closest walkable point, so the avatar never stands inside a wall or an
 * exhibit. Real GPS can jump through a wall: it is snapped where it lands, as
 * the visitor may really have gone round. Null when no walkable point is near.
 */
export function snapToNavMesh(navMesh: NavMesh, point: PolygonPoint2D, floor: number): Vec3 | null {
  const nearest = findNearestPoly(
    createFindNearestPolyResult(),
    navMesh,
    [point[0], floor, point[1]],
    SNAP_EXTENTS,
    DEFAULT_QUERY_FILTER,
  )
  return nearest.success ? nearest.position : null
}

/**
 * A walk of `east`/`north` metres from `from`, slid along the walkable
 * surface: blocked by walls the way a game character is, instead of passing
 * through them. Returns the plan offset actually walked (zero when stuck), so
 * the simulated GPS only ever moves where a visitor could.
 */
export function walkOnNavMesh(navMesh: NavMesh, from: Vec3, east: number, north: number) {
  const start = createFindNearestPolyResult()
  findNearestPoly(start, navMesh, from, SNAP_EXTENTS, DEFAULT_QUERY_FILTER)
  if (!start.success) return { east, north }
  // The plan is north-up: north is −z (see `estimatePlanPoint`).
  const target: Vec3 = [start.position[0] + east, start.position[1], start.position[2] - north]
  const moved = moveAlongSurface(
    navMesh,
    start.nodeRef,
    start.position,
    target,
    DEFAULT_QUERY_FILTER,
  )
  if (!moved.success) return { east: 0, north: 0 }
  return {
    east: moved.position[0] - from[0],
    north: from[2] - moved.position[2],
  }
}

/**
 * The route being followed: `points` (corners, for the directions), the
 * corridor `nodes` still ahead, and `from`, where the corridor starts (the
 * last live position it was moved to).
 */
export type FollowedRoute = { points: Vec3[]; nodes: NodeRef[]; from: Vec3 }

/** A followed route from `start` to `end`, or null when there is none. */
export function startRoute(navMesh: NavMesh, start: Vec3, end: Vec3): FollowedRoute | null {
  const route = museumNavigationRoute(navMesh, start, end)
  return route && { points: route.points, nodes: route.nodes, from: route.start }
}

/**
 * Moves the followed route's corridor to the live position: returns the
 * updated route (same `points` while the visitor keeps to it) and the line
 * still ahead, string-pulled from the live position. When the live position
 * can't be reached along the surface, the route is searched again from it
 * (new `points`); null when there is no route from there.
 */
export function followRoute(navMesh: NavMesh, route: FollowedRoute, end: Vec3, live: Vec3) {
  const corridor = { position: [...route.from] as Vec3, target: end, path: [...route.nodes] }
  const moved =
    pathCorridor.movePosition(corridor, live, navMesh, DEFAULT_QUERY_FILTER) &&
    Math.hypot(corridor.position[0] - live[0], corridor.position[2] - live[2]) <= CORRIDOR_SLACK
  const followed = moved
    ? { points: route.points, nodes: corridor.path, from: corridor.position }
    : startRoute(navMesh, live, end)
  if (!followed) return null
  const corners = pathCorridor.findCorners(
    { position: followed.from, target: end, path: followed.nodes },
    navMesh,
    MAX_CORNERS,
  )
  const ahead = corners ? [followed.from, ...corners.map(({ position }) => position)] : null
  return { route: followed, ahead, rerouted: !moved }
}
