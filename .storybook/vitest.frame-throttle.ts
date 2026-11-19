/**
 * Story tests only (the `storybook` Vitest project's setup; never the
 * Storybook UI, never visual regression runs): animation frames at 5 per
 * second instead of the display rate.
 *
 * Test machines have no GPU, so Pascal's museum map and the location map draw
 * on software WebGL, one CPU core per open scene, for as long as the story is
 * mounted. Vitest runs story files side by side in one Chromium: on a 4-core
 * runner those scenes starved the other files' stories, and a 300 ms address
 * debounce plus its mocked request outgrew Testing Library's 1 s wait
 * (MuseumMetadataForm). Fewer frames leave scenes, layout, events and timers
 * as they are; only how often they redraw changes. The e2e suite does the
 * same on CI (tests/helpers/software-webgl.ts).
 */
import { inject } from 'vitest'

// Visual runs keep real frame timing: they capture scenes as visitors see them.
if (!inject('visualRegression')) {
  const frame = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (callback) => window.setTimeout(() => frame(callback), 200)
}
