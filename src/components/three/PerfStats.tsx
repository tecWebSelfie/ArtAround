'use client'

import { addAfterEffect, useThree } from '@react-three/fiber'
import { useEffect } from 'react'

/**
 * Opt-in frame-time overlay for any React Three Fiber canvas (the Pascal
 * museum map, the object model viewer): FPS, CPU and GPU time per frame,
 * drawn by `stats-gl`. Add `?perf` to the page URL to show it, in
 * development or on the production build on a real phone.
 *
 * stats-gl 4 rather than r3f-perf (WebGL-only) or drei's `<StatsGl>`
 * (stats-gl 2, older than three's WebGPU timestamp API): the map renders
 * through Pascal's `WebGPURenderer`. See docs/development.md → 3D scenes.
 * The library is imported only with `?perf`: visitors never download it.
 * One canvas at a time: R3F's after-effects fire for every root on the page,
 * and an on-demand canvas (the model viewer) shows idle time as low FPS
 * until it is moved.
 */
export function PerfStats() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('perf')) return
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('stats-gl')
      .then(async ({ default: Stats }) => {
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
      // A debugging aid: a failed chunk or a backend stats-gl can't time
      // must not surface as an app error.
      .catch((error: unknown) => console.warn('PerfStats: stats-gl unavailable', error))
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [gl])

  return null
}
