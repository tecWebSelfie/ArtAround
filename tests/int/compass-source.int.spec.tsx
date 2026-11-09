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
  it('turns the heading with the screen when the phone is held in landscape', () => {
    // The visitor points the top of the screen: rotated 90° clockwise, that
    // is 90° to the right of where the device's top edge points.
    expect(compassHeading(orientation({ webkitCompassHeading: 0 }), 90)).toBe(90)
    expect(compassHeading(orientation({ alpha: 270, absolute: true }), 90)).toBe(180)
    expect(compassHeading(orientation({ alpha: 0, absolute: true }), 270)).toBe(270)
  })
  it('ignores jitter under two degrees, so a still phone does not re-render the map', async () => {
    vi.stubGlobal('DeviceOrientationEvent', {})
    vi.stubGlobal('isSecureContext', true)
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return useCompass('device')
    })
    await act(() => result.current.enable())
    act(() => window.dispatchEvent(orientation({ webkitCompassHeading: 15 })))
    const settled = renders
    for (const reading of [15.4, 14.7, 15.9, 14.2])
      act(() => window.dispatchEvent(orientation({ webkitCompassHeading: reading })))
    expect(result.current.heading).toBe(15)
    expect(renders).toBe(settled)
    act(() => window.dispatchEvent(orientation({ webkitCompassHeading: 40 })))
    expect(result.current.heading).toBe(40)
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
  it('reads Android absolute events and removes listeners when the device source stops', async () => {
    vi.stubGlobal('DeviceOrientationEvent', {})
    vi.stubGlobal('isSecureContext', true)
    const { result, rerender } = renderHook(({ mode }) => useCompass(mode), {
      initialProps: { mode: 'device' as 'device' | 'off' },
    })
    await act(() => result.current.enable())
    const event = () =>
      Object.assign(new Event('deviceorientationabsolute'), { alpha: 270, absolute: true })
    act(() => window.dispatchEvent(event()))
    expect(result.current.heading).toBe(90)
    expect(result.current.status).toBe('ready')
    rerender({ mode: 'off' })
    act(() => window.dispatchEvent(event()))
    expect(result.current.heading).toBeNull()
    expect(result.current.status).toBe('off')
  })
  it('handles insecure contexts and Safari permission errors without inventing a heading', async () => {
    const permission = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permission })
    vi.stubGlobal('isSecureContext', false)
    const { result } = renderHook(() => useCompass('device'))
    await act(() => result.current.enable())
    expect(result.current.status).toBe('unsupported')
    expect(permission).not.toHaveBeenCalled()
    vi.stubGlobal('isSecureContext', true)
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
