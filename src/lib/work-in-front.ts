import type { PolygonPoint2D } from '@pascal-app/core'

/**
 * Advanced localization (course brief, Navigator 18-33): from the visitor's
 * estimated position and the device's compass heading, decide which work they
 * are standing in front of, or which few works it could be when the app is
 * not sure (the visitor then picks one from their small images).
 *
 * Pure rule, no browser APIs: the caller passes a point on the north-up
 * museum plan (north is −z, east is +x, the convention of `src/lib/gps.ts`),
 * the heading in degrees clockwise from north (`null` without a compass),
 * and the placed works with their plan points.
 *
 * - A work counts only within `REACH_METRES`: farther, the visitor is not
 *   "in front of" it.
 * - With a heading, it must also lie within `HALF_FIELD_DEGREES` of where the
 *   device points; candidates are ranked by that angle, then by distance.
 * - Without one, every work in reach is a candidate, nearest first.
 * - Exactly one candidate is `sure`; several are `choose` (at most
 *   `MAX_CANDIDATES`, the ones the chooser shows); none is `none`.
 */
export const REACH_METRES = 3
export const HALF_FIELD_DEGREES = 30
export const MAX_CANDIDATES = 4

export type PlacedWork = { id: string; point: PolygonPoint2D }

export type WorkInFront =
  { kind: 'sure'; id: string } | { kind: 'choose'; ids: string[] } | { kind: 'none' }

/** Smallest difference between two angles, in degrees (0–180). */
const angleBetween = (a: number, b: number) => {
  const difference = (((a - b) % 360) + 360) % 360
  return Math.min(difference, 360 - difference)
}

export function workInFront(
  position: PolygonPoint2D,
  heading: number | null,
  works: readonly PlacedWork[],
): WorkInFront {
  const candidates = works
    .map(({ id, point }) => {
      const east = point[0] - position[0]
      const north = position[1] - point[1]
      // Compass bearing of the work from the visitor: 0 north, 90 east.
      const bearing = (Math.atan2(east, north) * 180) / Math.PI
      return {
        id,
        distance: Math.hypot(east, north),
        offAxis: heading === null ? 0 : angleBetween(bearing, heading),
      }
    })
    .filter(({ distance, offAxis }) => distance <= REACH_METRES && offAxis <= HALF_FIELD_DEGREES)
    // Stable sort: equal works keep the caller's order.
    .sort((a, b) => a.offAxis - b.offAxis || a.distance - b.distance)

  if (candidates.length === 0) return { kind: 'none' }
  if (candidates.length === 1) return { kind: 'sure', id: candidates[0]!.id }
  return { kind: 'choose', ids: candidates.slice(0, MAX_CANDIDATES).map(({ id }) => id) }
}
