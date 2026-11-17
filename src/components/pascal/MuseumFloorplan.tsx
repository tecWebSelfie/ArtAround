'use client'

import { groundLevelId } from '@/lib/pascal/museum-plugin/marker-hierarchy'
import { museumObjectId } from '@/lib/tour-navigation'
import { DEFAULT_PRIMARY } from '@/theme'
import { Box, Loader, useMantineTheme } from '@mantine/core'
import { type AnyNode, useScene } from '@pascal-app/core'
import { Flag, PersonStanding, type LucideIcon } from 'lucide-react'
import type { Vec3 } from 'navcat'
import { lazy, Suspense, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Pascal's own read-only floor plan (`FloorplanPreview` from
 * `@pascal-app/editor`, the 2D half of its `ViewerStage`): the museum as the
 * live scene draws it (walls, rooms, services, entrances, exits, each through
 * its `floorplan()`), with pan and zoom (drag, pinch, wheel). The 3D map stays
 * mounted underneath, hidden and paused, because routes and directions are
 * computed on its meshes, as `ViewerStage` itself keeps it. Loaded on the
 * first switch only: the editor package is large.
 *
 * `FloorplanPreview` refits its view whenever its scene changes, and has no
 * slot for extra content. So the plan reads the scene store unchanged (it
 * changes only when a map loads), and what is the visitor's own, the works'
 * photos, the route ahead and the visitor, is drawn by `PlanLayer` as plain
 * SVG at the end of the plan's scene group, like Pascal's editor draws its
 * own transient layers: it pans, zooms and rotates with the plan, and walking
 * never resets the visitor's view.
 */
const FloorplanPreview = lazy(() =>
  import('@pascal-app/editor').then((module) => ({ default: module.FloorplanPreview })),
)

/** The map's view (see `useGuidanceSettings`): the 3D model or the floor plan. */
export type MapView = '3d' | '2d'

type Work = { id: string; x: number; z: number; src: string }

export function MuseumFloorplan({
  position,
  path,
  catalog,
  roots,
}: {
  /** The tour's works: their photos become the round pictures. */
  catalog: readonly { id: string; thumbnail?: string | null }[]
  /** Where the avatar stands: the live position, else the route's start. */
  position: Vec3 | null
  /** The route still ahead. */
  path: Vec3[] | null
  /**
   * The museum map's root ids: the plan waits until the shared scene store
   * holds this map (`MapViewer` loads it), not the museum seen before.
   */
  roots: readonly string[]
}) {
  // The museum's primary (blue, or the museum's own in museum mode).
  const color = useMantineTheme().colors.museum?.[6] ?? DEFAULT_PRIMARY[6]
  const nodes = useScene((state) => state.nodes) as Record<string, AnyNode>
  const loaded = useScene((state) => state.rootNodeIds.some((id) => roots.includes(id)))
  const works = useWorks(nodes, catalog)
  const frame = useRef<HTMLDivElement>(null)
  const loader = (
    <Box className="grid size-full place-items-center">
      <Loader size="sm" />
    </Box>
  )
  return (
    // Its own zoom buttons (no prop turns them off; their inline display
    // needs !important) would sit under the map's control dock: hidden, as
    // pinch and wheel zoom remain. The compass and the floor picker are off
    // too (museums have one floor).
    <Box
      ref={frame}
      pos="absolute"
      inset={0}
      bg="var(--mantine-color-body)"
      className="[&_div:has(>button[aria-label='Zoom_out'])]:hidden!"
    >
      {loaded ? (
        <Suspense fallback={loader}>
          <FloorplanPreview
            className="size-full"
            // The level the works are on (else Pascal shows the lowest one, a
            // basement).
            levelId={groundLevelId(nodes)}
            showCompass={false}
            showLevelSelector={false}
          />
          <PlanLayer frame={frame} works={works} position={position} path={path} color={color} />
        </Suspense>
      ) : (
        loader
      )}
    </Box>
  )
}

/** Every placed work with its photo: the catalog's, else its asset's own (the standee's). */
function useWorks(
  nodes: Record<string, AnyNode>,
  catalog: readonly { id: string; thumbnail?: string | null }[],
): Work[] {
  return useMemo(() => {
    const photos = new Map(catalog.map((object) => [object.id, object.thumbnail]))
    return Object.values(nodes).flatMap((node) => {
      const objectId = museumObjectId(node)
      if (!objectId) return []
      const item = node as { position?: Vec3; asset?: { thumbnail?: string } }
      const src = photos.get(objectId) ?? item.asset?.thumbnail
      if (!src || !item.position) return []
      return [{ id: node.id, x: item.position[0], z: item.position[2], src }]
    })
  }, [nodes, catalog])
}

/** Plan sizes in metres: a work's picture, the visitor's and the flag's discs. */
const WORK_RADIUS = 0.65
const VISITOR_RADIUS = 0.75
const FLAG_RADIUS = 0.5

/**
 * The visitor's own layer of the plan, portaled into a `<g>` kept as the last
 * child of `FloorplanPreview`'s scene group (its rotation applies, and the
 * layer draws over the plan). Rendered beside the plan in the same Suspense,
 * so the plan's SVG exists when the layout effect runs; it runs after every
 * render, which follows every scene change (`nodes`), so a group Pascal adds
 * never ends up over the layer.
 */
function PlanLayer({
  frame,
  works,
  position,
  path,
  color,
}: {
  frame: React.RefObject<HTMLDivElement | null>
  works: Work[]
  position: Vec3 | null
  path: Vec3[] | null
  color: string
}) {
  const [layer] = useState(() => document.createElementNS('http://www.w3.org/2000/svg', 'g'))
  useLayoutEffect(() => {
    const scene = frame.current?.querySelector('svg[data-floorplan-preview] > g')
    if (scene && scene.lastChild !== layer) scene.appendChild(layer)
  })
  useLayoutEffect(() => () => layer.remove(), [layer])
  // One circular clip for every picture (object bounding box units).
  const clip = `plan-photo-${useId().replace(/:/g, '')}`
  const end = path && path.length > 1 ? path.at(-1) : undefined
  return createPortal(
    <g pointerEvents="none">
      <defs>
        <clipPath id={clip} clipPathUnits="objectBoundingBox">
          <circle cx={0.5} cy={0.5} r={0.5} />
        </clipPath>
      </defs>
      {works.map((work) => (
        <g key={work.id}>
          <circle cx={work.x} cy={work.z} r={WORK_RADIUS} fill="#ffffff" />
          <image
            href={work.src}
            x={work.x - WORK_RADIUS}
            y={work.z - WORK_RADIUS}
            width={WORK_RADIUS * 2}
            height={WORK_RADIUS * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clip})`}
          />
          <circle
            cx={work.x}
            cy={work.z}
            r={WORK_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={WORK_RADIUS * 0.14}
          />
        </g>
      ))}
      {path && end && (
        <>
          <polyline
            points={path.map(([x, , z]) => `${x},${z}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={5}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Disc Icon={Flag} x={end[0]} z={end[2]} r={FLAG_RADIUS} color={color} />
        </>
      )}
      {position && (
        <Disc
          Icon={PersonStanding}
          x={position[0]}
          z={position[2]}
          r={VISITOR_RADIUS}
          color={color}
        />
      )}
    </g>,
    layer,
  )
}

/** A disc of `color` with a white ring and a white icon, as the markers' plan symbols. */
function Disc({
  Icon,
  x,
  z,
  r,
  color,
}: {
  Icon: LucideIcon
  x: number
  z: number
  r: number
  color: string
}) {
  const size = r * 1.15
  return (
    <>
      <circle cx={x} cy={z} r={r} fill={color} stroke="#ffffff" strokeWidth={r * 0.18} />
      <Icon
        x={x - size / 2}
        y={z - size / 2}
        width={size}
        height={size}
        color="#ffffff"
        strokeWidth={2.5}
      />
    </>
  )
}
