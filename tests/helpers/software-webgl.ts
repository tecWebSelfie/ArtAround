import type { BrowserContext, Page } from '@playwright/test'

/** Keep software-rendered maps from starving browser input/signalling in cloud regression runs. */
export async function prepareSoftwareWebGL(target: BrowserContext | Page) {
  if (process.env.E2E_SOFTWARE_WEBGL !== 'true') return
  // Scheduling is test-only; pointer events, layout, network and the real WebGL scene stay intact.
  await target.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => window.setTimeout(() => raf(callback), 200)
  })
}
