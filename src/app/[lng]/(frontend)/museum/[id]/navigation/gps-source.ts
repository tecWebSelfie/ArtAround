'use client'

import { MAX_ACCURACY_METRES, moveFix, type GpsFix } from '@/lib/gps'
import { useCallback, useEffect, useState } from 'react'

/**
 * Where GPS fixes come from. Both sources produce the same `GpsFix`, so the
 * rest of the guidance (offset → plan point → step) doesn't know which one
 * is running:
 *
 * - `device`: the browser's `navigator.geolocation.watchPosition`;
 * - `simulated`: a fix moved by the D-pad, for demos and tests indoors.
 *
 * The simulator ships only in builds made with NEXT_PUBLIC_GPS_SIMULATOR=true.
 */
export type GpsMode = 'off' | 'device' | 'simulated'

export const GPS_SIMULATOR_ENABLED = process.env.NEXT_PUBLIC_GPS_SIMULATOR === 'true'

/** Simulated fixes start here; only the movement from this point matters. */
const SIMULATED_ORIGIN: GpsFix = { latitude: 45.4642, longitude: 9.19, accuracy: 4 }

export function useGpsFix(mode: GpsMode) {
  const [fix, setFix] = useState<GpsFix | null>(mode === 'simulated' ? SIMULATED_ORIGIN : null)
  const [error, setError] = useState<string | null>(null)
  // A new mode starts from a clean fix: reset during render when the mode
  // changes (React's pattern for state that follows a prop), not in the
  // effect, so no render ever pairs the new mode with the old fix.
  const [seenMode, setSeenMode] = useState(mode)
  if (seenMode !== mode) {
    setSeenMode(mode)
    setFix(mode === 'simulated' ? SIMULATED_ORIGIN : null)
    setError(null)
  }

  // No Geolocation API is a fact about the browser, derived rather than stored.
  // `navigator` is missing during server rendering, where nothing is reported.
  const unsupported =
    mode === 'device' && typeof navigator !== 'undefined' && !('geolocation' in navigator)

  useEffect(() => {
    if (mode !== 'device' || unsupported) return
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        // A very inaccurate fix would throw the estimate across the building.
        if (coords.accuracy > MAX_ACCURACY_METRES) return
        setFix({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        })
      },
      (failure) => setError(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2_000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [mode, unsupported])

  /** Simulator only: walk `east`/`north` metres. */
  const move = useCallback(
    (east: number, north: number) => setFix((current) => current && moveFix(current, east, north)),
    [],
  )

  return { fix, error: unsupported ? 'unsupported' : error, move }
}
