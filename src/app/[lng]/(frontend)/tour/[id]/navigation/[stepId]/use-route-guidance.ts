'use client'

import { distanceAlongPath, estimatePlanPoint, gpsOffsetMetres, type GpsFix } from '@/lib/gps'
import type { MuseumRooms } from '@/lib/museum-rooms'
import { buildDirections, samplePath, stepAtDistance } from '@/lib/tour-directions'
import type { PolygonPoint2D } from '@pascal-app/core'
import { useEffect, useMemo, useState } from 'react'
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
  route,
  rooms,
  fix,
}: {
  route: MuseumRoute | null
  rooms: MuseumRooms
  fix: GpsFix | null
}) {
  const steps = useMemo(
    () => buildDirections(route?.path ?? null, rooms, route?.target),
    [route, rooms],
  )
  const samples = useMemo(() => (route?.path ? samplePath(route.path) : []), [route])

  const start: PolygonPoint2D | null = route?.start ? [route.start[0], route.start[2]] : null
  const startKey = start?.join(',') ?? null
  const [anchor, setAnchor] = useState<{ key: string; fix: GpsFix } | null>(null)
  // Take the anchor fix at a new confirmed start (or at the first fix after it).
  useEffect(() => {
    if (startKey && fix && anchor?.key !== startKey) setAnchor({ key: startKey, fix })
    if (!fix && anchor) setAnchor(null)
  }, [startKey, fix, anchor])

  const estimate =
    start && fix && anchor?.key === startKey
      ? estimatePlanPoint(start, gpsOffsetMetres(anchor.fix, fix))
      : null
  const progress = estimate && samples.length > 1 ? distanceAlongPath(samples, estimate) : null

  // The shown step: GPS moves it when progress passes a step, the arrows move
  // it by hand, and a new route starts again from the first step.
  const [current, setCurrent] = useState(0)
  useEffect(() => setCurrent(0), [steps])
  const gpsStep = progress ? stepAtDistance(steps, progress.distance) : null
  useEffect(() => {
    if (gpsStep !== null) setCurrent(gpsStep)
  }, [gpsStep])

  return {
    steps,
    current: Math.min(current, Math.max(0, steps.length - 1)),
    setCurrent,
    estimate,
    /** The estimate snapped onto the route, at floor height, for the map dot. */
    progressPoint:
      progress && route?.start
        ? ([progress.point[0], route.start[1], progress.point[1]] as [number, number, number])
        : null,
  }
}
