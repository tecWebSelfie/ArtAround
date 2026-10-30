'use client'

import type { Picture } from '@/lib/picture'
import { lazy, Suspense } from 'react'

// The viewer's code loads on the first open, never with the page.
const PictureLightboxDialog = lazy(() =>
  import('./PictureLightboxDialog').then((m) => ({ default: m.PictureLightboxDialog })),
)

/**
 * Full-screen viewer for a set of pictures (`@mantine/lightbox`): swipe or
 * arrows between them, pinch or click to zoom, thumbnails when there are
 * several. Shared by every place that shows a document's pictures (the
 * `DetailCover` of each detail page, the content's `PictureGrid`), so they
 * browse and zoom the same way.
 *
 * Controlled by one value: the open picture's `index`, or `null` when closed,
 * so callers keep a single `useState<number | null>(null)`. Closed, it renders
 * nothing and has fetched nothing.
 */
export function PictureLightbox({
  pictures,
  index,
  onChange,
}: {
  pictures: Picture[]
  index: number | null
  onChange: (index: number | null) => void
}) {
  if (index === null) return null
  return (
    <Suspense fallback={null}>
      <PictureLightboxDialog pictures={pictures} index={index} onChange={onChange} />
    </Suspense>
  )
}
