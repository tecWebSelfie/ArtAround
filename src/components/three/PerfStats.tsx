'use client'

import { addAfterEffect, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { fetchCurrentUser } from '@/lib/auth-client'

/**
 * Opt-in frame-time overlay for the object model viewer's React Three Fiber
 * canvas (`ModelViewer`): FPS, CPU and GPU time per frame, drawn by
 * `stats-gl`. Add `?perf` to the page URL to show it: always in development;
 * on the production build (e.g. on a real phone) only for a signed-in super
 * admin. The check is cosmetic, not a security boundary: no data is shown.
 *
 * The museum map needs none of this: Pascal's viewer already draws its own
 * richer panel with `?perf` (frame and GPU time, draw calls, triangles,
 * memory, long tasks; `@pascal-app/viewer`'s PerfPanel), for anyone.
 * stats-gl rather than r3f-perf (unmaintained since 2024). The library is
 * imported only when allowed, so visitors never download it. An on-demand
 * canvas shows idle time as low FPS until it is moved.
 */
export function PerfStats() {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('perf')) return
    let cancelled = false
    let cleanup: (() => void) | undefined
    void allowed()
      .then((ok) => (ok && !cancelled ? import('stats-gl') : null))
      .then(async (module) => {
        if (!module || cancelled) return
        const Stats = module.default
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

/** Development builds always; production only for a signed-in super admin. */
async function allowed() {
  if (process.env.NODE_ENV === 'development') return true
  const user = await fetchCurrentUser()
  return Boolean(user?.isSuperAdmin)
}
