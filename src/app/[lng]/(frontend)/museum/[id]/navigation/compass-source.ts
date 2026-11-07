'use client'

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

/** Absolute headings only: a relative alpha must never masquerade as north. */
export function compassHeading(event: CompassEvent): number | null {
  if (
    typeof event.webkitCompassHeading === 'number' &&
    Number.isFinite(event.webkitCompassHeading) &&
    (event.webkitCompassAccuracy === undefined || event.webkitCompassAccuracy >= 0)
  ) {
    return ((event.webkitCompassHeading % 360) + 360) % 360
  }
  return event.absolute && event.alpha !== null && Number.isFinite(event.alpha)
    ? (360 - (event.alpha % 360)) % 360
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
    const expire = () => {
      setHeading(null)
      setStatus('waiting')
    }
    const receive = (event: DeviceOrientationEvent) => {
      const next = compassHeading(event)
      if (next === null) return
      setHeading(next)
      setStatus('ready')
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
        setHeading(((Math.atan2(east, north) * 180) / Math.PI + 360) % 360)
        setStatus('ready')
      }
    },
    [mode],
  )
  return { heading: mode === 'off' ? null : heading, status, enable, turn }
}
