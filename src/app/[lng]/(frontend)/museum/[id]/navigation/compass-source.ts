'use client'

import { angleBetween, bearing, normalizeDegrees } from '@/lib/work-in-front'
import { useCallback, useEffect, useState } from 'react'
import type { GpsMode } from './gps-source'

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
  webkitCompassAccuracy?: number
}
type PermissionDevice = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>
}
export type CompassStatus = 'off' | 'waiting' | 'ready' | 'denied' | 'unsupported'

/** Smaller heading changes are sensor jitter: not worth re-rendering the map. */
const MIN_TURN_DEGREES = 2

/**
 * Where the top of the screen points, in degrees from north. Absolute
 * headings only: a relative alpha must never masquerade as north. Sensors
 * report the device's top edge; `screenAngle` (`screen.orientation.angle`,
 * clockwise) turns that into the screen's top when the phone is in landscape.
 */
export function compassHeading(event: CompassEvent, screenAngle = 0): number | null {
  if (
    typeof event.webkitCompassHeading === 'number' &&
    Number.isFinite(event.webkitCompassHeading) &&
    (event.webkitCompassAccuracy === undefined || event.webkitCompassAccuracy >= 0)
  ) {
    return normalizeDegrees(event.webkitCompassHeading + screenAngle)
  }
  return event.absolute && event.alpha !== null && Number.isFinite(event.alpha)
    ? normalizeDegrees(360 - event.alpha + screenAngle)
    : null
}

/** Opt-in device sensor; permission is requested directly from the visitor's tap. */
export function useCompass(mode: GpsMode) {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<CompassStatus>('off')
  const [heading, setHeading] = useState<number | null>(null)
  const [seenMode, setSeenMode] = useState(mode)
  if (mode !== seenMode) {
    setSeenMode(mode)
    setEnabled(false)
    setHeading(null)
    setStatus('off')
  }
  const enable = useCallback(async () => {
    if (mode !== 'device') return
    const api = window.DeviceOrientationEvent as PermissionDevice | undefined
    if (!api || !window.isSecureContext) {
      setStatus('unsupported')
      return
    }
    try {
      // Safari requires this call inside the click handler, before any await.
      if (api.requestPermission && (await api.requestPermission()) !== 'granted') {
        setStatus('denied')
        return
      }
      setStatus('waiting')
      setEnabled(true)
    } catch {
      setStatus('denied')
    }
  }, [mode])

  useEffect(() => {
    if (!enabled || mode !== 'device') return
    let expiry: ReturnType<typeof setTimeout> | undefined
    // The heading last published as state, local to this listener.
    let published: number | null = null
    const expire = () => {
      published = null
      setHeading(null)
      setStatus('waiting')
    }
    const receive = (event: DeviceOrientationEvent) => {
      const next = compassHeading(event, window.screen?.orientation?.angle ?? 0)
      if (next === null) return
      // Events arrive tens of times a second (two streams on Android): jitter
      // sets no state at all, so the whole navigation doesn't re-render.
      if (published === null || angleBetween(published, next) >= MIN_TURN_DEGREES) {
        published = next
        setHeading(next)
        setStatus('ready')
      }
      clearTimeout(expiry)
      // A suspended or stopped sensor must not keep filtering by an old heading.
      expiry = setTimeout(expire, 8_000)
    }
    window.addEventListener('deviceorientation', receive)
    window.addEventListener('deviceorientationabsolute', receive)
    return () => {
      clearTimeout(expiry)
      window.removeEventListener('deviceorientation', receive)
      window.removeEventListener('deviceorientationabsolute', receive)
    }
  }, [enabled, mode])
  const turn = useCallback(
    (east: number, north: number) => {
      if (mode === 'simulated' && (east || north)) {
        setHeading(normalizeDegrees(bearing(east, north)))
        setStatus('ready')
      }
    },
    [mode],
  )
  return { heading: mode === 'off' ? null : heading, status, enable, turn }
}
