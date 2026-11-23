/**
 * Where the navigation map's camera goes to show the visitor's journey: the
 * start, the route and the destination together, inside the part of the
 * canvas that the header and the floating controls leave free (the "route
 * overview" of navigation apps, whose padding is the UI drawn over the map).
 *
 * Pure geometry, so it is unit-tested apart from the 3D scene: the caller
 * (`FrameJourney` in the navigation map) reads the camera's field of view,
 * the canvas size and the overlay insets, and hands the result to
 * camera-controls' `setLookAt`. The camera keeps the given azimuth (the map
 * does not spin) and slant, and never comes closer than `minDistance`, so a
 * short hop still shows the rooms around it.
 */

export type Point3 = readonly [number, number, number]

export type JourneyViewInput = {
  /** Every point the view must contain (start, route, destination), in metres. */
  points: readonly Point3[]
  /** Vertical field of view, degrees (three's `PerspectiveCamera.fov`). */
  fov: number
  /** Canvas size in CSS pixels. */
  width: number
  height: number
  /** Canvas pixels covered by UI on each side (header, controls, panels). */
  insets: { top: number; bottom: number; left: number; right: number }
  /** Camera direction around the vertical axis (camera-controls' azimuth). */
  azimuth: number
  /** Angle between the camera's view and the vertical, radians (0 = straight down). */
  polar: number
  /** Metres added around the points, so the ends do not touch the edges. */
  margin: number
  /** The closest the camera may come, metres from its target. */
  minDistance: number
}

export type JourneyView = { position: Point3; target: Point3; distance: number }

/** The smallest share of a canvas side kept as the band to frame in. */
const MIN_BAND = 0.25

export function journeyView({
  points,
  fov,
  width,
  height,
  insets,
  azimuth,
  polar,
  margin,
  minDistance,
}: JourneyViewInput): JourneyView | null {
  if (points.length === 0 || width <= 0 || height <= 0) return null

  // A plan bounding circle: the route lies on floors, so its height spread is
  // negligible next to its extent and the floor's mean height is the target's.
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let sumY = 0
  for (const [x, y, z] of points) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
    sumY += y
  }
  const centre: Point3 = [(minX + maxX) / 2, sumY / points.length, (minZ + maxZ) / 2]
  const radius = Math.hypot(maxX - minX, maxZ - minZ) / 2 + margin

  // The free band, as a share of each side (never under MIN_BAND, so a
  // screen crowded by panels still gets a usable framing instead of infinity).
  const bandY = Math.max(MIN_BAND, (height - insets.top - insets.bottom) / height)
  const bandX = Math.max(MIN_BAND, (width - insets.left - insets.right) / width)
  const halfV = (fov * Math.PI) / 360
  const halfH = Math.atan(Math.tan(halfV) * (width / height))
  // Half-angles of the band, as seen from the camera.
  const bandHalfV = Math.atan(Math.tan(halfV) * bandY)
  const bandHalfH = Math.atan(Math.tan(halfH) * bandX)
  const distance = Math.max(minDistance, radius / Math.sin(Math.min(bandHalfV, bandHalfH)))

  // Shift the target so the circle sits in the middle of the band rather
  // than of the canvas. At the target's distance one pixel spans
  // `metresPerPixel`; a floor step towards the camera moves a point down the
  // screen by its length times cos(polar), hence the division.
  const metresPerPixel = (2 * distance * Math.tan(halfV)) / height
  const down = ((insets.top - insets.bottom) / 2) * metresPerPixel
  const right = ((insets.left - insets.right) / 2) * metresPerPixel
  const away = down / Math.max(Math.cos(polar), 0.2)
  // camera-controls places the camera at target + (sin az, cos az) on the
  // ground ring: "away" from it is the opposite way, its right is (cos, -sin).
  const sin = Math.sin(azimuth)
  const cos = Math.cos(azimuth)
  const target: Point3 = [
    centre[0] - sin * away - cos * right,
    centre[1],
    centre[2] - cos * away + sin * right,
  ]
  const ring = Math.sin(polar) * distance
  const position: Point3 = [
    target[0] + ring * sin,
    target[1] + Math.cos(polar) * distance,
    target[2] + ring * cos,
  ]
  return { position, target, distance }
}
