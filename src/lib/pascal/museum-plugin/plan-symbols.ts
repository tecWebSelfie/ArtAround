import type { FloorplanGeometry } from '@pascal-app/core'
import type { LucideIcon } from 'lucide-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * How museum markers read on Pascal's 2D floor plan (`floorplan()` of each
 * marker kind, drawn by `FloorplanPreview` in the visitor's 2D view and in the
 * map editor): a disc in the marker's color with its own icon in white, the
 * same pairing the 3D markers, badges and buttons use (`markers.ts`). Plan
 * units are metres.
 */
const ICON_URL = new Map<LucideIcon, string>()

/** The lucide icon as a white SVG data URL, for a plan `image`. */
export function planIconUrl(Icon: LucideIcon): string {
  let url = ICON_URL.get(Icon)
  if (!url) {
    const svg = renderToStaticMarkup(
      createElement(Icon, { color: '#ffffff', size: 24, strokeWidth: 2.5 }),
    )
    url = `data:image/svg+xml,${encodeURIComponent(svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`
    ICON_URL.set(Icon, url)
  }
  return url
}

/** A marker's plan symbol at plan point (x, y): colored disc, white ring, icon. */
export function markerPlanSymbol(
  { Icon, hex }: { Icon: LucideIcon; hex: string },
  x: number,
  y: number,
  radius = 0.55,
): FloorplanGeometry {
  return {
    kind: 'group',
    children: [
      {
        kind: 'circle',
        cx: x,
        cy: y,
        r: radius,
        fill: hex,
        stroke: '#ffffff',
        strokeWidth: radius * 0.18,
      },
      {
        kind: 'image',
        url: planIconUrl(Icon),
        center: [x, y],
        width: radius * 1.15,
        height: radius * 1.15,
      },
    ],
  }
}
