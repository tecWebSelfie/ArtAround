/**
 * Visual regression for Storybook stories, on top of the existing
 * `@storybook/addon-vitest` run (Vitest browser mode + Playwright Chromium).
 *
 * After each story test renders (and its play function finishes), the story's
 * Storybook canvas is compared against reference images with Vitest's
 * built-in `toMatchScreenshot`, once per viewport in `VIEWPORTS`: the app is
 * mobile first, so every story gets a phone and a desktop reference
 * (`<story-id>-mobile`, `<story-id>-desktop`). The canvas comes from
 * preview.tsx's `afterEach` via story-canvas.ts. When the canvas is empty
 * because the story only renders portalled content (Mantine modals), the page
 * body is captured instead.
 *
 * It is opt-in: it only runs when the config provides `visualRegression`
 * (`pnpm test:visual`), so ordinary story tests and the Storybook test panel
 * are unaffected and new stories don't fail for missing references.
 * `pnpm test:visual:update` (re)writes the references in `__screenshots__/`
 * (path set in vitest.config.mts).
 *
 * A story opts out with `parameters: { visual: { disable: true } }` when it
 * renders content that never settles, such as the live WebGL map, the camera,
 * or the cycling hero word.
 */
import { afterEach, expect, inject } from 'vitest'
import { page } from 'vitest/browser'
import { takeStoryCanvas } from './story-canvas'

declare module 'vitest' {
  export interface ProvidedContext {
    visualRegression: boolean
  }
}

/** The part of the composed story that `testStory` puts on the test context. */
type StoryContext = {
  story?: { id: string; parameters: { visual?: { disable?: boolean } } }
}

/** Phone first (iPhone 12–15 CSS size), then a common laptop size. */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

afterEach(async (context) => {
  // Always consumed, so a stale canvas never leaks into the next story.
  const canvas = takeStoryCanvas()
  if (!inject('visualRegression')) return
  const { story } = context as typeof context & StoryContext
  // A failed render or play function already reports the problem; a screenshot of it would only add noise.
  if (!story || !canvas || story.parameters.visual?.disable || context.task.result?.errors?.length)
    return

  // The canvas stays mounted until the next story runs, so it can be captured
  // here. Resizing re-lays it out (CSS and Mantine's JS media queries); the
  // matcher's own "two identical shots in a row" check waits for that to settle.
  for (const viewport of VIEWPORTS) {
    await page.viewport(viewport.width, viewport.height)
    // A zero-height canvas means everything visible is portalled to <body>.
    const target = canvas.getBoundingClientRect().height > 0 ? canvas : canvas.ownerDocument.body
    await expect.element(page.elementLocator(target)).toMatchScreenshot(
      `${story.id}-${viewport.name}`,
      {
        screenshotOptions: { animations: 'disabled', caret: 'hide' },
        // The matcher retakes shots until two in a row match. With every file
        // running in parallel, its 5s default ran out even on static stories
        // that capture in ~1s on their own.
        timeout: 30_000,
      },
    )
  }
}, 120_000) // two viewports, each with up to 30s to settle
