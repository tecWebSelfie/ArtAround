'use client'

import { Box, Loader } from '@mantine/core'
import { lazy, Suspense } from 'react'

/**
 * Pascal's own read-only floor plan (`FloorplanPreview` from
 * `@pascal-app/editor`): the museum drawn in 2D from every node's
 * `floorplan()` builder, services and entrances included, with its own pan,
 * zoom (pinch, wheel, drag). It reads the scene the 3D map already loaded
 * (`useScene`), so switching costs no second load; the 3D map stays mounted
 * underneath, paused, because routes and directions are computed on its
 * meshes. Loaded on the first switch only: the editor package is large.
 */
const FloorplanPreview = lazy(() =>
  import('@pascal-app/editor').then((module) => ({ default: module.FloorplanPreview })),
)

/** The map's plan view: `MapView` "2d" (see `useGuidanceSettings`). */
export type MapView = '3d' | '2d'

export function MuseumFloorplan() {
  return (
    // Its own zoom buttons (no prop turns them off; their inline display needs !important) would sit under the map's
    // control dock: hidden, as pinch and wheel zoom too. The compass and the
    // floor picker are off for the same reason (museums have one floor).
    <Box
      pos="absolute"
      inset={0}
      className="bg-(--mantine-color-body) [&_div:has(>button[aria-label='Zoom_out'])]:hidden!"
    >
      <Suspense
        fallback={
          <Box className="grid size-full place-items-center">
            <Loader size="sm" />
          </Box>
        }
      >
        <FloorplanPreview className="size-full" showCompass={false} showLevelSelector={false} />
      </Suspense>
    </Box>
  )
}
