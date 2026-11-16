import { describe, expect, it } from 'vitest'
import { followRoute, startRoute, walkOnNavMesh } from '@/lib/live-route'
import { createRouteMuseum } from '@/mocks/tour-navigation.mock'
import type { Vec3 } from 'navcat'

// The route story's museum: a 12 × 8 m floor split by a wall at x = 6 from
// z = 0 to z = 5, so West → East goes round through the opening at z 5–8.
const { navMesh } = createRouteMuseum('/models/route.glb')
const west: Vec3 = [2, 0, 2]
const east: Vec3 = [10, 0, 2]
const plan = (point: Vec3 | undefined) => [point?.[0], point?.[2]]

describe('following the route from the live position', () => {
  const route = startRoute(navMesh, west, east)!

  it('keeps the route while the visitor walks along it, drawing from where they are', () => {
    const live: Vec3 = [3, route.from[1], 4]
    const next = followRoute(navMesh, route, east, live)!
    expect(next.rerouted).toBe(false)
    // Same route, so the directions keep their steps.
    expect(next.route.points).toBe(route.points)
    expect(plan(next.ahead?.[0])[0]).toBeCloseTo(3)
    expect(plan(next.ahead?.[0])[1]).toBeCloseTo(4)
    expect(plan(next.ahead?.at(-1))[0]).toBeCloseTo(10, 0)
  })

  it('searches a new route when the live position is beyond a wall', () => {
    // A GPS jump across the dividing wall, into the East hall.
    const live: Vec3 = [8, route.from[1], 2]
    const next = followRoute(navMesh, route, east, live)!
    expect(next.rerouted).toBe(true)
    expect(plan(next.route.points[0])[0]).toBeCloseTo(8, 0)
  })

  it('stops the simulated walk at the wall instead of passing through it', () => {
    const walked = walkOnNavMesh(navMesh, [5, route.from[1], 2], 3, 0)
    expect(walked.east).toBeLessThan(1.5)
  })
})
