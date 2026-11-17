'use client'

import { distanceAlongPath, estimatePlanPoint, gpsOffsetMetres, type GpsFix } from '@/lib/gps'
import {
  followRoute,
  snapToNavMesh,
  startRoute,
  walkOnNavMesh,
  type FollowedRoute,
} from '@/lib/live-route'
import type { MuseumRooms } from '@/lib/museum-rooms'
import { buildDirections, samplePath, stepAtDistance } from '@/lib/tour-directions'
import type { PolygonPoint2D } from '@pascal-app/core'
import type { NavMesh, Vec3 } from 'navcat'
import { useMemo, useState } from 'react'
import type { MuseumRoute } from './MuseumMap'

/**
 * Glue between the map's route, the directions and GPS:
 *
 *   pinned position (from MuseumMap: `at`, else the entrance)
 *     + GPS offset since that pin → estimate on the plan
 *   estimate → snapped onto the navmesh → live position (the avatar)
 *   live position → moves along the route's corridor; blocked → new route
 *   route → direction steps; live position along it → the current step
 *
 * The anchor (pinned point + the GPS fix taken there) resets whenever the pin
 * changes, so every QR scan, "set as my position", arrival or completed stop
 * cancels the GPS drift collected so far and puts the avatar back on the pin.
 * See `src/lib/live-route.ts` for the pinned/live split.
 */
export function useRouteGuidance({
  route,
  rooms,
  fix,
  startPoint,
  anchorScope = '',
  navMesh = null,
}: {
  route: MuseumRoute | null
  rooms: MuseumRooms
  fix: GpsFix | null
  /** Confirmed work, even when free navigation has no destination/route yet. */
  startPoint?: PolygonPoint2D | null
  /** Changing GPS source or confirming a different work resets its reference fix. */
  anchorScope?: string
  /** The navmesh the route was found on: live positions stay on it. */
  navMesh?: NavMesh | null
}) {
  // Prefer the map's reachable pinned point; use the work's centre only
  // while no navmesh route/start has been resolved yet.
  const pin: PolygonPoint2D | null = route?.start
    ? [route.start[0], route.start[2]]
    : (startPoint ?? null)
  const estimate = useGpsEstimate(pin, fix, anchorScope)
  const position = useLivePosition(estimate, route?.start ?? null, navMesh)
  const path = useActivePath(route, position, navMesh)

  const steps = useMemo(
    () => buildDirections(path.full, rooms, route?.target),
    [path.full, rooms, route?.target],
  )
  const samples = useMemo(() => (path.full ? samplePath(path.full) : []), [path.full])
  const progress =
    position && samples.length > 1 ? distanceAlongPath(samples, [position[0], position[2]]) : null
  const gpsStep = progress ? stepAtDistance(steps, progress.distance) : null

  // The shown step: GPS moves it when progress passes a step, the arrows move
  // it by hand, and a new path starts again from where GPS puts the visitor
  // on it (the first step without GPS). Both are reactions to a change (new
  // steps, new GPS step), tracked by remembering the last value seen, again
  // during render instead of in effects.
  const [current, setCurrent] = useState(gpsStep ?? 0)
  const [seen, setSeen] = useState({ steps, gpsStep })
  if (seen.steps !== steps) {
    setSeen({ steps, gpsStep })
    setCurrent(gpsStep ?? 0)
  } else if (seen.gpsStep !== gpsStep) {
    setSeen({ steps, gpsStep })
    if (gpsStep !== null) setCurrent(gpsStep)
  }

  return {
    steps,
    current: Math.min(current, Math.max(0, steps.length - 1)),
    setCurrent,
    /** Where the GPS puts the visitor on the plan [x, z], before snapping. */
    estimate,
    /** The live position (the avatar): the pin until GPS moves it. */
    position: position ?? route?.start ?? null,
    /** The route still ahead of the live position (what the map draws). */
    path: path.ahead,
    /**
     * The simulator's walk, slid along walls: the offset actually walked
     * from the live position, so the fake GPS never passes through a wall.
     */
    walk: (east: number, north: number) => {
      const from = position ?? route?.start
      return navMesh && from ? walkOnNavMesh(navMesh, from, east, north) : { east, north }
    },
  }
}

/**
 * Where the visitor is on the plan: the confirmed start moved by how far the
 * GPS has drifted since the fix taken there (the anchor). Null without a
 * start, a fix, or before the anchor is taken.
 */
function useGpsEstimate(start: PolygonPoint2D | null, fix: GpsFix | null, anchorScope: string) {
  const startKey = start ? `${anchorScope}:${start.join(',')}` : null
  const [anchor, setAnchor] = useState<{ key: string; fix: GpsFix } | null>(null)
  // Take the anchor fix at a new confirmed start (or at the first fix after it).
  // Adjusted during render (React's pattern for state derived from changing
  // inputs) rather than in an effect, which would render once with a stale
  // anchor first. Each branch makes its own condition false, so it settles.
  if (startKey && fix && anchor?.key !== startKey) setAnchor({ key: startKey, fix })
  else if (!fix && anchor) setAnchor(null)
  if (!start || !fix || anchor?.key !== startKey) return null
  return estimatePlanPoint(start, gpsOffsetMetres(anchor.fix, fix))
}

/**
 * The estimate as a point the avatar can stand on: snapped onto the navmesh
 * at the pin's floor height. Without a navmesh (tests, a map without one) it
 * stays where the GPS puts it; with no walkable point near, on the pin.
 */
function useLivePosition(
  estimate: PolygonPoint2D | null,
  pin: Vec3 | null,
  navMesh: NavMesh | null,
) {
  const [x, z] = estimate ?? [Number.NaN, Number.NaN]
  const floor = pin?.[1] ?? 0
  return useMemo((): Vec3 | null => {
    if (Number.isNaN(x)) return null
    if (!navMesh) return [x, floor, z]
    return snapToNavMesh(navMesh, [x, z], floor) ?? pin
  }, [x, z, floor, navMesh, pin])
}

/**
 * Metres (in plan) the live position must be from the destination before a
 * visitor pinned at it counts as having walked away and gets directions back.
 */
const AWAY_FROM_DESTINATION = 1.5

/**
 * The route being followed and the line still ahead of the live position
 * (see `src/lib/live-route.ts`). It starts as the map's route from the pin;
 * each live position moves its corridor along, and one that can't be
 * reached along the surface searches a new route from there. A new pin or
 * destination (a new map route) starts over from the map's route.
 */
function useActivePath(route: MuseumRoute | null, position: Vec3 | null, navMesh: NavMesh | null) {
  const [active, setActive] = useState<{
    route: MuseumRoute | null
    followed: FollowedRoute | null
  }>({ route: null, followed: null })
  let followed = active.followed
  if (active.route !== route) {
    followed =
      navMesh && route?.start && route.end ? startRoute(navMesh, route.start, route.end) : null
    setActive({ route, followed })
  }
  // No route from the pin (pinned at the destination itself: a QR scanned at
  // the next stop) but the visitor has walked away from it: guide them back
  // from where they are now. Set once; from then on the corridor follows.
  if (
    !followed &&
    navMesh &&
    position &&
    route?.end &&
    Math.hypot(position[0] - route.end[0], position[2] - route.end[2]) > AWAY_FROM_DESTINATION
  ) {
    const back = startRoute(navMesh, position, route.end)
    if (back) {
      followed = back
      setActive({ route, followed })
    }
  }
  const next =
    navMesh && followed && position && route?.end
      ? followRoute(navMesh, followed, route.end, position)
      : null
  // Kept in state, adjusted during render like the anchor above: the next
  // render follows on from where this one got to, so it settles at once.
  if (next && followed && next.route.from.some((value, index) => value !== followed.from[index])) {
    setActive({ route, followed: next.route })
  }
  const full = next?.route.points ?? followed?.points ?? route?.path ?? null
  return { full, ahead: next?.ahead ?? full }
}
