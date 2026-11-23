import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Heights that follow the viewport must not reflow mid-scroll. On a phone,
 * scrolling collapses the browser's URL bar: the dynamic viewport grows and
 * every dvh-sized element jumps (the navigator home's first screen grew its
 * gap above the title; cover images re-cropped, which reads as a zoom; the
 * same audit found the map overlays' caps and the tour start page).
 * Scrollable surfaces are sized in svh — dvh's value at load, with the
 * toolbars expanded, so the swap moves nothing on the way in — while
 * full-screen non-scrolling shells keep dvh, where filling whatever viewport
 * exists is the point.
 *
 * No test runner emulates the toolbar collapse (dvh and svh compute the same
 * on a desktop), so the regression guard is static: each guarded expression
 * keeps its unit, and a revert back to dvh fails here.
 */
const ROOT = path.resolve(__dirname, '../../src')

/** [file, the svh fragment it must contain, the dvh fragment it must not] */
const SCROLLABLE: [file: string, svh: string, dvh: string][] = [
  ['app/[lng]/(frontend)/(tabs)/layout.tsx', 'below-md:min-h-svh', 'below-md:min-h-dvh'],
  [
    'app/[lng]/(frontend)/(tabs)/layout.tsx',
    '--tabs-first-screen:calc(100svh',
    '--tabs-first-screen:calc(100dvh',
  ],
  [
    'app/[lng]/(frontend)/(tabs)/navigator/NavigatorPage.tsx',
    'h-[10svh] from-md:h-[6svh]',
    'h-[10dvh] from-md:h-[6dvh]',
  ],
  [
    'components/mantine/DetailCover.tsx',
    "const COVER_HEIGHT = 'clamp(160px, 32svh, 360px)'",
    "const COVER_HEIGHT = 'clamp(160px, 32dvh, 360px)'",
  ],
  [
    'app/[lng]/(frontend)/globals.css',
    '--site-pane-height: calc(100svh',
    '--site-pane-height: calc(100dvh',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/GuidanceSettings.tsx',
    'max-h-[60svh]',
    'max-h-[60dvh]',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/NavigationServices.tsx',
    'max-h-[50svh]',
    'max-h-[50dvh]',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/NearbyWorksNotice.tsx',
    'max-h-[45svh]',
    'max-h-[45dvh]',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/tour/[tourId]/[stepId]/@modal/open/StepModal.tsx',
    'height="clamp(120px, 26svh, 280px)"',
    'height="clamp(120px, 26dvh, 280px)"',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/tour/[tourId]/NavigationStartPage.module.css',
    'min-height: calc(100svh',
    'min-height: calc(100dvh',
  ],
  [
    'app/[lng]/(frontend)/museum/[id]/navigation/tour/[tourId]/NavigationStartPage.module.css',
    'padding-top: 7svh;',
    'padding-top: 7dvh;',
  ],
]

/** Full-screen non-scrolling shells: [file, the dvh fragment they keep] */
const IMMERSIVE: [file: string, dvh: string][] = [
  // The map stage: a full-viewport canvas, the page never scrolls.
  ['app/[lng]/(frontend)/museum/[id]/navigation/TourNavigation.tsx', 'h="100dvh"'],
  // The map editor's shell, same rule.
  ['app/[lng]/(frontend)/museum/[id]/edit/mapeditor/MapEditor.tsx', 'className="h-dvh"'],
  // The scanner's viewfinder frame, `position: fixed` behind it and md-gated.
  [
    'app/[lng]/(frontend)/scan/scan.module.css',
    'calc((100dvh - 2 * var(--mantine-spacing-xl)) * 4 / 3)',
  ],
]

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')

describe('viewport-height sizes stay put while the URL bar collapses', () => {
  it.each(SCROLLABLE)('%s keeps %s', (file, svh, dvh) => {
    const source = read(file)
    expect(source, `${file} lost its svh sizing`).toContain(svh)
    expect(source, `${file} went back to dvh`).not.toContain(dvh)
  })

  it.each(IMMERSIVE)('%s keeps its full-screen dvh', (file, dvh) => {
    expect(read(file), `${file} lost its full-screen fill`).toContain(dvh)
  })
})
