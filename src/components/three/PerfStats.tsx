'use client'

import { addAfterEffect, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'

/**
 * Opt-in frame-time overlay for any React Three Fiber canvas (the Pascal
 * museum map, the object model viewer): FPS, CPU and GPU time per frame,
 * drawn by `stats-gl`. Add `?perf` to the page URL to show it, in
 * development or on the production build on a real phone.
 *
 * Why stats-gl and not r3f-perf: r3f-perf (last release Nov 2024) reads
 * WebGL-only counters, and the museum map renders through Pascal's
 * `WebGPURenderer`; stats-gl 4 times both backends (GPU time where the
 * browser exposes timer/timestamp queries). drei's `<StatsGl>` wraps the
 * older stats-gl 2, which predates three's current WebGPU timestamp API.
 *
 * The library is imported only once `?perf` is present, so visitors never
 * download it.
 */
export function PerfStats() {
  const gl = useThree((state) => state.gl)
  // Inside a Canvas, so client-only: `location` is always there.
  const [enabled] = useState(() => new URLSearchParams(location.search).has('perf'))

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('stats-gl').then(async ({ default: Stats }) => {
      if (cancelled) return
      const stats = new Stats({ trackGPU: true, trackHz: true })
      await stats.init(gl)
      if (cancelled) return stats.dispose()
      document.body.appendChild(stats.dom)
      // After every rendered frame, whoever renders it (r3f or Pascal's own
      // pipeline): the same hook drei's StatsGl uses.
      const stop = addAfterEffect(() => stats.update())
      cleanup = () => {
        stop()
        stats.dispose()
        stats.dom.remove()
      }
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [enabled, gl])

  return null
}
