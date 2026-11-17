// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRouteGuidance } from '@/app/[lng]/(frontend)/museum/[id]/navigation/use-route-guidance'
import { useGpsFix } from '@/app/[lng]/(frontend)/museum/[id]/navigation/gps-source'
import { moveFix } from '@/lib/gps'
import { snapToNavMesh } from '@/lib/live-route'
import { createRouteMuseum } from '@/mocks/tour-navigation.mock'

// Real positioning hooks: only the operating system's GPS boundary is stubbed.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
describe('GPS identification without an active route', () => {
  const start = { latitude: 45, longitude: 9, accuracy: 4 }
  const rooms = { rooms: [], doors: [], objects: [] }
  it('tracks movement from the confirmed work and recalibrates at a new confirmation', () => {
    const { result, rerender } = renderHook(
      ({ fix, point }) =>
        useRouteGuidance({
          route: null,
          rooms,
          fix,
          startPoint: point,
        }),
      { initialProps: { fix: start, point: [10, 20] as [number, number] } },
    )
    expect(result.current.estimate).toEqual([10, 20])
    rerender({ fix: moveFix(start, 2, 0), point: [10, 20] })
    expect(result.current.estimate?.[0]).toBeCloseTo(12)
    // Without a navmesh the live position (the avatar) is the estimate itself.
    expect(result.current.position?.[0]).toBeCloseTo(12)
    rerender({ fix: moveFix(start, 2, 0), point: [50, 60] })
    expect(result.current.estimate).toEqual([50, 60])
  })
  it('withdraws an unusable fix, keeps a still visitor’s fix and stops watching on disable', () => {
    vi.useFakeTimers()
    let receive!: PositionCallback
    let fail!: PositionErrorCallback
    const clearWatch = vi.fn()
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
          receive = success
          fail = error
          return 7
        }),
        clearWatch,
      },
    })
    const { result, rerender } = renderHook(({ mode }) => useGpsFix(mode), {
      initialProps: { mode: 'device' as 'device' | 'off' },
    })
    const position = (accuracy: number) =>
      ({ coords: { ...start, accuracy } }) as GeolocationPosition
    act(() => receive(position(4)))
    expect(result.current.fix).not.toBeNull()
    act(() => receive(position(200)))
    expect(result.current.fix).toBeNull()
    act(() => receive(position(4)))
    // The OS reports again only when the device moves: a visitor standing in
    // front of a work for minutes keeps their fix (and the nearby-work notice).
    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })
    expect(result.current.fix).not.toBeNull()
    act(() => fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError))
    expect(result.current.error).toBe('denied')
    act(() => receive(position(4)))
    expect(result.current.error).toBeNull()
    rerender({ mode: 'off' })
    expect(clearWatch).toHaveBeenCalledWith(7)
    expect(result.current.fix).toBeNull()
  })
  it('reanchors when switching GPS sources at the same confirmed work', () => {
    const { result, rerender } = renderHook(
      ({ fix, source }) =>
        useRouteGuidance({
          route: null,
          rooms,
          fix,
          startPoint: [10, 20],
          anchorScope: source,
        }),
      { initialProps: { fix: start, source: 'device' } },
    )
    rerender({ fix: moveFix(start, 100, 100), source: 'simulated' })
    expect(result.current.estimate).toEqual([10, 20])
  })
})

describe('Directions following the route path', () => {
  const rooms = { rooms: [], doors: [], objects: [] }
  const route = (path: [number, number, number][]) => ({
    path,
    start: path[0],
    end: path.at(-1)!,
    target: null,
  })
  it('keeps the shown step on the same route and restarts on a new one', () => {
    // The map keeps the route object until its destination or start changes
    // (useTourCursor memoizes the destination on its URL parameters only).
    const along = route([
      [0, 0, 0],
      [10, 0, 0],
    ])
    const { result, rerender } = renderHook(
      ({ current }) => useRouteGuidance({ route: current, rooms, fix: null }),
      { initialProps: { current: along } },
    )
    const steps = result.current.steps
    expect(steps.length).toBeGreaterThan(1)
    act(() => result.current.setCurrent(1))
    rerender({ current: along })
    expect(result.current.current).toBe(1)
    // A new route (another destination) rebuilds the directions from the first step.
    rerender({
      current: route([
        [0, 0, 0],
        [0, 0, 10],
      ]),
    })
    expect(result.current.steps).not.toBe(steps)
    expect(result.current.current).toBe(0)
  })
})

describe('pinned at the destination itself', () => {
  // The route story's museum (see live-route.int.spec.ts): a 12 × 8 m floor.
  const { navMesh } = createRouteMuseum('/models/route.glb')
  const rooms = { rooms: [], doors: [], objects: [] }
  const fix = { latitude: 45, longitude: 9, accuracy: 4 }
  // A QR scanned at the next stop: the pin and the destination are one point.
  const here = snapToNavMesh(navMesh, [10, 2], 0)!
  const route = { path: null, start: here, end: here, target: null }

  it('gives no directions while there, and leads back once the visitor walks away', () => {
    const { result, rerender } = renderHook(
      ({ current }) => useRouteGuidance({ route, rooms, fix: current, navMesh }),
      { initialProps: { current: fix } },
    )
    expect(result.current.steps).toHaveLength(0)
    // Four metres west (plan −x), still on the floor.
    rerender({ current: moveFix(fix, -4, 0) })
    expect(result.current.steps.length).toBeGreaterThan(0)
    expect(result.current.path?.at(-1)?.[0]).toBeCloseTo(here[0], 0)
  })
})
