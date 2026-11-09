// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRouteGuidance } from '@/app/[lng]/(frontend)/museum/[id]/navigation/use-route-guidance'
import { useGpsFix } from '@/app/[lng]/(frontend)/museum/[id]/navigation/gps-source'
import { moveFix } from '@/lib/gps'

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
    expect(result.current.progressPoint?.[0]).toBeCloseTo(12)
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
    act(() => vi.advanceTimersByTime(5 * 60_000))
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
