// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compassHeading,
  useCompass,
} from '@/app/[lng]/(frontend)/museum/[id]/navigation/compass-source'

// Browser sensors/permissions are the boundary; the hook and lifecycle are real.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
const orientation = (values: Record<string, unknown>) =>
  Object.assign(
    new Event('deviceorientation'),
    { alpha: null, beta: null, gamma: null, absolute: false },
    values,
  ) as DeviceOrientationEvent

describe('absolute compass measurements', () => {
  it('reads iOS and absolute alpha, rejecting relative and invalid readings', () => {
    expect(compassHeading(orientation({ webkitCompassHeading: 90 }))).toBe(90)
    expect(compassHeading(orientation({ alpha: 270, absolute: true }))).toBe(90)
    expect(compassHeading(orientation({ alpha: 270 }))).toBeNull()
    expect(compassHeading(orientation({ alpha: NaN, absolute: true }))).toBeNull()
    expect(
      compassHeading(orientation({ webkitCompassHeading: 90, webkitCompassAccuracy: -1 })),
    ).toBeNull()
  })
  it('requests Safari permission on demand, expires measurements and cleans up', async () => {
    vi.useFakeTimers()
    const permission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permission })
    vi.stubGlobal('isSecureContext', true)
    const { result, rerender } = renderHook(({ mode }) => useCompass(mode), {
      initialProps: { mode: 'device' as 'device' | 'off' },
    })
    expect(permission).not.toHaveBeenCalled()
    await act(() => result.current.enable())
    expect(permission).toHaveBeenCalledOnce()
    act(() => window.dispatchEvent(orientation({ webkitCompassHeading: 15 })))
    expect(result.current.heading).toBe(15)
    act(() => vi.advanceTimersByTime(8_001))
    expect(result.current.heading).toBeNull()
    rerender({ mode: 'off' })
    act(() => window.dispatchEvent(orientation({ webkitCompassHeading: 90 })))
    expect(result.current.heading).toBeNull()
  })
  it('keeps the nearby chooser available when orientation permission is denied', async () => {
    vi.stubGlobal('DeviceOrientationEvent', {
      requestPermission: vi.fn().mockResolvedValue('denied'),
    })
    vi.stubGlobal('isSecureContext', true)
    const { result } = renderHook(() => useCompass('device'))
    await act(() => result.current.enable())
    expect(result.current.status).toBe('denied')
    expect(result.current.heading).toBeNull()
  })
  it('turns the simulated compass in the D-pad movement direction', () => {
    const { result } = renderHook(() => useCompass('simulated'))
    act(() => result.current.turn(2, 0))
    expect(result.current.heading).toBe(90)
    act(() => result.current.turn(0, 2))
    expect(result.current.heading).toBe(0)
  })
})
