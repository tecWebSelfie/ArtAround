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
  const [fix, setFix] = useState<GpsFix | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFix(mode === 'simulated' ? SIMULATED_ORIGIN : null)
    setError(null)
    if (mode !== 'device') return
    if (!('geolocation' in navigator)) {
      setError('unsupported')
      return
    }
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        // A very inaccurate fix would throw the estimate across the building.
        if (coords.accuracy > MAX_ACCURACY_METRES) return
        setFix({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy })
      },
      (failure) => setError(failure.code === failure.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2_000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [mode])

  /** Simulator only: walk `east`/`north` metres. */
  const move = useCallback(
    (east: number, north: number) => setFix((current) => current && moveFix(current, east, north)),
    [],
  )

  return { fix, error, move }
}
