import type { FloorplanGeometry } from '@pascal-app/core'
import type { LucideIcon, LucideIconData } from 'lucide-react'

/**
 * How museum markers read on Pascal's 2D floor plan (`floorplan()` of each
 * marker kind, drawn by `FloorplanPreview` in the visitor's 2D view and in the
 * map editor): a disc in the marker's color with its own icon in white, the
 * same pairing the 3D markers, badges and buttons use (`markers.ts`). Plan
 * units are metres.
 */
const ICON_URL = new Map<LucideIcon, string>()

/**
 * The icon's drawing (`[tag, attributes][]`). lucide-react exports only
 * components; each one renders `Icon` with its data as the `icon` prop, so the
 * data is read from that element instead of rendering it: this module ships
 * with every map (3D included), and `react-dom/server` would weigh ~50 KB.
 */
function iconNode(Icon: LucideIcon): LucideIconData['node'] {
  const render = (Icon as unknown as { render?: (props: object, ref: null) => unknown }).render
  const element = render?.({}, null) as { props?: { icon?: LucideIconData } } | undefined
  return element?.props?.icon?.node ?? []
}

const escape = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** The lucide icon as a white SVG data URL, for a plan `image`. */
export function planIconUrl(Icon: LucideIcon): string {
  let url = ICON_URL.get(Icon)
  if (!url) {
    const shapes = iconNode(Icon)
      .map(([tag, attributes]) => {
        const attrs = Object.entries(attributes)
          .filter(([name]) => name !== 'key')
          .map(([name, value]) => ` ${name}="${escape(value)}"`)
          .join('')
        return `<${tag}${attrs}/>`
      })
      .join('')
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
      `stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`
    url = `data:image/svg+xml,${encodeURIComponent(svg)}`
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
