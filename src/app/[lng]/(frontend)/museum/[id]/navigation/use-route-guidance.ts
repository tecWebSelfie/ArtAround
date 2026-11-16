'use client'

import { distanceAlongPath, estimatePlanPoint, gpsOffsetMetres, type GpsFix } from '@/lib/gps'
import type { MuseumRooms } from '@/lib/museum-rooms'
import { buildDirections, samplePath, stepAtDistance } from '@/lib/tour-directions'
import type { PolygonPoint2D } from '@pascal-app/core'
import { useMemo, useState } from 'react'
import type { MuseumRoute } from './MuseumMap'

/**
 * Glue between the map's route, the directions and GPS:
 *
 *   route (from MuseumMap) → direction steps
 *   confirmed start + GPS offset since that start → estimate on the plan
 *   estimate → closest point on the route → which step the visitor is on
 *
 * The anchor (start point + the GPS fix taken there) resets whenever the
 * confirmed position changes, so every QR scan or "set as my position"
 * cancels the GPS drift collected so far.
 */
export function useRouteGuidance({
  route: nextRoute,
  rooms,
  fix,
  startPoint,
  anchorScope = '',
}: {
  route: MuseumRoute | null
  rooms: MuseumRooms
  fix: GpsFix | null
  /** Confirmed work, even when free navigation has no destination/route yet. */
  startPoint?: PolygonPoint2D | null
  /** Changing GPS source or confirming a different work resets its reference fix. */
  anchorScope?: string
}) {
  const route = useSameRoute(nextRoute)
  const steps = useMemo(
    () => buildDirections(route?.path ?? null, rooms, route?.target),
    [route, rooms],
  )
  const samples = useMemo(() => (route?.path ? samplePath(route.path) : []), [route])

  // Prefer the map's reachable teleport point; use the work's centre only
  // while no navmesh route/start has been resolved yet.
  const start: PolygonPoint2D | null = route?.start
    ? [route.start[0], route.start[2]]
    : (startPoint ?? null)
  const estimate = useGpsEstimate(start, fix, anchorScope)
  const progress = estimate && samples.length > 1 ? distanceAlongPath(samples, estimate) : null
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

  // Snapped onto the route when there is one; free navigation can track a
  // position without a route to snap to.
  const onPlan = progress && route?.start ? progress.point : estimate
  return {
    steps,
    current: Math.min(current, Math.max(0, steps.length - 1)),
    setCurrent,
    estimate,
    /** The estimate snapped onto the route, at floor height, for the map dot. */
    progressPoint: onPlan
      ? ([onPlan[0], route?.start?.[1] ?? 0, onPlan[1]] as [number, number, number])
      : null,
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
 * The route, kept as the same object while its path, start and target are
 * the same. The map rebuilds the route object on every URL change (a modal,
 * `?more=`, a reading option), mostly along the same path: the directions
 * must restart only when the path itself changes (a new destination or
 * start, the step-free navmesh, a rerouted corridor), and then always.
 */
function useSameRoute(route: MuseumRoute | null) {
  const [kept, setKept] = useState(route)
  const same = kept === route || (kept !== null && route !== null && sameRoute(kept, route))
  if (!same) setKept(route)
  return same ? kept : route
}

function samePoints(a: readonly number[] | null, b: readonly number[] | null): boolean {
  if (!a || !b) return a === b
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function sameRoute(a: MuseumRoute, b: MuseumRoute) {
  if (!samePoints(a.start, b.start) || !samePoints(a.target, b.target)) return false
  const [pathA, pathB] = [a.path, b.path]
  if (!pathA || !pathB) return pathA === pathB
  return pathA.length === pathB.length && pathA.every((point, i) => samePoints(point, pathB[i]))
}
