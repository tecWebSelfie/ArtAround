import type { PolygonPoint2D } from '@pascal-app/core'

/**
 * GPS progress along a tour route, in three small steps:
 *
 *   1. offset   = how far the device moved since the last confirmed position
 *                 (latest GPS fix − fix taken at that position), in metres
 *   2. estimate = confirmed position + offset, on the museum plan
 *   3. progress = the closest point of the route to that estimate
 *
 * Indoor GPS is noisy, so the estimate is never trusted as a position: it only
 * says how far along the route the visitor has got. The confirmed position
 * (URL `at`, set by QR or by choosing an object) stays the only shared truth.
 *
 * The plan is drawn north-up (Pascal's compass north, the top of its floor
 * plan, is −z), so one metre north is one metre towards −z.
 */
export type GpsFix = { latitude: number; longitude: number; accuracy: number }

/** Fixes worse than this many metres are ignored instead of moving the estimate. */
export const MAX_ACCURACY_METRES = 50

const EARTH_RADIUS_METRES = 6_371_000

/**
 * East/north metres between two fixes. Over a building, the Earth is flat
 * enough for the equirectangular approximation: latitude degrees are a fixed
 * length, longitude degrees shrink with the cosine of the latitude.
 */
export function gpsOffsetMetres(from: GpsFix, to: GpsFix) {
  const radians = Math.PI / 180
  const north = (to.latitude - from.latitude) * radians * EARTH_RADIUS_METRES
  const east =
    (to.longitude - from.longitude) *
    radians *
    EARTH_RADIUS_METRES *
    Math.cos(from.latitude * radians)
  return { east, north }
}

/** The inverse of `gpsOffsetMetres`: the fix reached by walking east/north metres. */
export function moveFix(fix: GpsFix, east: number, north: number): GpsFix {
  const radians = Math.PI / 180
  return {
    ...fix,
    latitude: fix.latitude + north / (EARTH_RADIUS_METRES * radians),
    longitude:
      fix.longitude + east / (EARTH_RADIUS_METRES * radians * Math.cos(fix.latitude * radians)),
  }
}

/** Step 2: the anchor plus the offset, on the north-up plan (north = −z). */
export function estimatePlanPoint(
  anchor: PolygonPoint2D,
  offset: { east: number; north: number },
): PolygonPoint2D {
  return [anchor[0] + offset.east, anchor[1] - offset.north]
}

/**
 * Step 3: metres walked along the route to its closest point to `point`,
 * checking each straight segment of the path (`samples` are plan points).
 */
export function distanceAlongPath(samples: PolygonPoint2D[], point: PolygonPoint2D) {
  let best = { distance: 0, gap: Number.POSITIVE_INFINITY, point: samples[0] ?? point }
  let walked = 0
  for (let index = 1; index < samples.length; index++) {
    const a = samples[index - 1]
    const b = samples[index]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    // Projection of the point onto segment a→b, clamped to the segment.
    const t =
      length === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) /
                (length * length),
            ),
          )
    const closest: PolygonPoint2D = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    const gap = Math.hypot(point[0] - closest[0], point[1] - closest[1])
    if (gap < best.gap) best = { distance: walked + length * t, gap, point: closest }
    walked += length
  }
  return best
}
