'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The visitor's position for "near you" hints on the navigator home (the
 * museums rail, the search dropdown's distance badges).
 *
 * Location is never asked for on load: when the browser already grants it
 * (an earlier visit, the map's GPS), the position is read at once; otherwise
 * it stays `idle` until a caller runs `locate()` on the visitor's tap. The
 * coordinates stay on the device: callers compute distances here, and send
 * the server at most a rounded position (`MuseumsRail`).
 */
export type DevicePosition =
  | { status: 'idle' | 'locating' | 'unavailable'; coords: null }
  | { status: 'located'; coords: GeolocationCoordinates }

const IDLE: DevicePosition = { status: 'idle', coords: null }

export function useDevicePosition() {
  const [position, setPosition] = useState<DevicePosition>(IDLE)

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPosition({ status: 'unavailable', coords: null })
      return
    }
    setPosition({ status: 'locating', coords: null })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ status: 'located', coords }),
      () => setPosition({ status: 'unavailable', coords: null }),
      // A fix up to ten minutes old is close enough for "near you", and lets
      // the rail and the search share one reading.
      { maximumAge: 10 * 60_000, timeout: 15_000 },
    )
  }, [])

  // Already granted: read it now, without a prompt. Granted later (another
  // caller's `locate()`, such as the rail's "Use my location"): read it then
  // too, so every user of the hook on the page learns the position. The
  // second read is served from the browser's cache (`maximumAge`).
  useEffect(() => {
    let cancelled = false
    let status: PermissionStatus | undefined
    const onChange = () => {
      if (status?.state === 'granted') locate()
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((permission) => {
        if (cancelled) return
        status = permission
        permission.addEventListener('change', onChange)
        onChange()
      })
      .catch(() => {})
    return () => {
      cancelled = true
      status?.removeEventListener('change', onChange)
    }
  }, [locate])

  return { ...position, locate }
}
