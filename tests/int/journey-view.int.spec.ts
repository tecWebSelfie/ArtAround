import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { journeyView, type JourneyViewInput, type Point3 } from '@/lib/pascal/journey-view'

/**
 * The navigation map frames the visitor's journey (start, route, destination)
 * inside the canvas band the header and controls leave free. These specs
 * place a real three.js camera where `journeyView` says and check, in pixels,
 * that every point lands inside that band.
 */

const PHONE = { width: 412, height: 780 }
const OVERLAYS = { top: 180, bottom: 150, left: 0, right: 0 }

/** Screen pixel of `point` for a camera at the computed view. */
function project(
  view: NonNullable<ReturnType<typeof journeyView>>,
  { fov, width, height }: Pick<JourneyViewInput, 'fov' | 'width' | 'height'>,
  point: Point3,
) {
  const camera = new PerspectiveCamera(fov, width / height, 0.1, 1000)
  camera.position.set(...view.position)
  camera.lookAt(...view.target)
  camera.updateMatrixWorld()
  const ndc = new Vector3(...point).project(camera)
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height }
}

const base = {
  fov: 50,
  ...PHONE,
  insets: OVERLAYS,
  polar: 0.88,
  margin: 2,
  minDistance: 20,
} satisfies Omit<JourneyViewInput, 'points' | 'azimuth'>

describe('journeyView', () => {
  it('keeps a long route inside the band left by the header and controls', () => {
    const points: Point3[] = [
      [-30, 0, 12],
      [-10, 0, 12],
      [-10, 0, -18],
      [25, 0, -18],
    ]
    for (const azimuth of [0, Math.PI / 4, Math.PI, -2.2]) {
      const view = journeyView({ ...base, points, azimuth })
      expect(view).not.toBeNull()
      for (const point of points) {
        const { x, y } = project(view!, base, point)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(PHONE.width)
        expect(y).toBeGreaterThanOrEqual(OVERLAYS.top)
        expect(y).toBeLessThanOrEqual(PHONE.height - OVERLAYS.bottom)
      }
    }
  })

  it('centres the journey in the free band, not in the whole canvas', () => {
    const points: Point3[] = [
      [0, 0, 0],
      [4, 0, 0],
    ]
    const view = journeyView({ ...base, points, azimuth: 0.6 })!
    const { y } = project(view, base, [2, 0, 0])
    const bandMiddle = (OVERLAYS.top + PHONE.height - OVERLAYS.bottom) / 2
    // Within a few percent: the slant makes the floor recede, the target is exact.
    expect(Math.abs(y - bandMiddle)).toBeLessThan(PHONE.height * 0.05)
  })

  it('never comes closer than the minimum distance for a short hop', () => {
    const view = journeyView({
      ...base,
      points: [
        [0, 0, 0],
        [1, 0, 0],
      ],
      azimuth: 0,
    })!
    expect(view.distance).toBe(base.minDistance)
  })

  it('keeps the azimuth, so the map does not spin', () => {
    const azimuth = 1.1
    const view = journeyView({ ...base, points: [[3, 0, 3]], azimuth })!
    const [px, , pz] = view.position
    const [tx, , tz] = view.target
    expect(Math.atan2(px - tx, pz - tz)).toBeCloseTo(azimuth)
  })

  it('has nothing to frame without points or a sized canvas', () => {
    expect(journeyView({ ...base, points: [], azimuth: 0 })).toBeNull()
    expect(journeyView({ ...base, width: 0, points: [[0, 0, 0]], azimuth: 0 })).toBeNull()
  })
})
