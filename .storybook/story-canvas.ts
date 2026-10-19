/**
 * Hand-off of the story canvas from Storybook to the visual-regression hook.
 *
 * In a test run Storybook mounts each story into its own canvas element and
 * only exposes it to annotations (`afterEach({ canvasElement })` in
 * preview.tsx), not to the Vitest test context. The preview records it here so
 * `.storybook/vitest.visual.ts` can screenshot exactly that element. Kept free
 * of Vitest imports because preview.tsx also runs in the Storybook UI.
 */
const KEY = Symbol.for('artaround.storyCanvas')
type CanvasHolder = { [KEY]?: HTMLElement }

/** Called from the preview's `afterEach`, i.e. after render and play. */
export function setStoryCanvas(canvasElement: HTMLElement) {
  ;(globalThis as CanvasHolder)[KEY] = canvasElement
}

/** Returns the canvas of the story that just ran, and forgets it. */
export function takeStoryCanvas(): HTMLElement | undefined {
  const canvas = (globalThis as CanvasHolder)[KEY]
  delete (globalThis as CanvasHolder)[KEY]
  return canvas
}
