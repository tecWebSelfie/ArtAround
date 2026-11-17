'use client'

import { groundLevelId } from '@/lib/pascal/museum-plugin/marker-hierarchy'
import {
  PLAN_ROUTE_NODE_TYPE,
  PLAN_VISITOR_NODE_TYPE,
  PLAN_WORK_NODE_TYPE,
} from '@/lib/pascal/museum-plugin/plan-overlay'
import { museumObjectId } from '@/lib/tour-navigation'
import { Box, Loader } from '@mantine/core'
import { type AnyNode, useScene } from '@pascal-app/core'
import type { Vec3 } from 'navcat'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

/**
 * Pascal's own read-only floor plan (`FloorplanPreview` from
 * `@pascal-app/editor`, the 2D half of its `ViewerStage`): the museum drawn
 * from every node's `floorplan()` builder, with pan and zoom (drag, pinch,
 * wheel). The 3D map stays mounted underneath, hidden and paused, because
 * routes and directions are computed on its meshes, as `ViewerStage` itself
 * keeps it. Loaded on the first switch only: the editor package is large.
 *
 * The plan gets the live scene plus nodes that exist only here
 * (`plan-overlay.ts`): every work as a round picture of its photo, the
 * visitor where the avatar stands, and the route ahead with a flag at its end.
 */
const FloorplanPreview = lazy(() =>
  import('@pascal-app/editor').then((module) => ({ default: module.FloorplanPreview })),
)

/** The map's view (see `useGuidanceSettings`): the 3D model or the floor plan. */
export type MapView = '3d' | '2d'

export function MuseumFloorplan({
  position,
  path,
  photos,
}: {
  /** Each work's photo by object id (the catalog's small thumbnails). */
  photos: ReadonlyMap<string, string>
  /** Where the avatar stands: the live position, else the route's start. */
  position: Vec3 | null
  /** The route still ahead. */
  path: Vec3[] | null
}) {
  const scene = usePlanScene(position, path, photos)
  return (
    // Its own zoom buttons (no prop turns them off; their inline display
    // needs !important) would sit under the map's control dock: hidden, as
    // pinch and wheel zoom too. The compass and the floor picker are off for
    // the same reason (museums have one floor).
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
        <FloorplanPreview
          className="size-full"
          scene={scene}
          showCompass={false}
          showLevelSelector={false}
        />
      </Suspense>
    </Box>
  )
}

/** The live scene with the plan-only nodes on the ground level. */
function usePlanScene(
  position: Vec3 | null,
  path: Vec3[] | null,
  photos: ReadonlyMap<string, string>,
) {
  const nodes = useScene((state) => state.nodes) as Record<string, AnyNode>
  const installedPlugins = useScene((state) => state.installedPlugins)
  const pictures = useRoundPictures(nodes, photos)
  return useMemo(() => {
    const levelId = groundLevelId(nodes)
    if (!levelId) return { nodes, installedPlugins }
    const color = primaryColor()
    const overlay: Record<string, unknown>[] = []
    for (const node of Object.values(nodes)) {
      const url = museumObjectId(node) ? pictures.get(node.id) : undefined
      if (!url) continue
      const [x, , z] = (node as { position: Vec3 }).position
      overlay.push({
        id: `planWork_${node.id}`,
        type: PLAN_WORK_NODE_TYPE,
        position: [x, 0, z],
        url,
      })
    }
    if (path && path.length > 1) {
      overlay.push({ id: 'planRoute_visitor', type: PLAN_ROUTE_NODE_TYPE, points: path, color })
    }
    if (position) {
      overlay.push({ id: 'planVisitor_you', type: PLAN_VISITOR_NODE_TYPE, position, color })
    }
    const next: Record<string, unknown> = { ...nodes }
    for (const node of overlay) {
      next[node.id as string] = {
        object: 'node',
        visible: true,
        metadata: {},
        parentId: levelId,
        ...node,
      }
    }
    const level = nodes[levelId] as AnyNode & { children: string[] }
    next[levelId] = { ...level, children: [...level.children, ...overlay.map((node) => node.id)] }
    return { nodes: next as Record<string, AnyNode>, installedPlugins }
  }, [nodes, installedPlugins, pictures, position, path])
}

/** The museum's primary color (blue, or the museum's own in museum mode). */
function primaryColor() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--mantine-primary-color-filled')
    .trim()
  return value || '#0077d1'
}

/**
 * Each placed work's photo (its asset thumbnail) as a round SVG picture with a
 * ring in the primary color. The photo is embedded as a data URL: an SVG used
 * as an image may not load anything external. Built once per photo.
 */
function useRoundPictures(nodes: Record<string, AnyNode>, photos: ReadonlyMap<string, string>) {
  const [pictures, setPictures] = useState(() => new Map<string, string>())
  const sources = useMemo(() => {
    const result = new Map<string, string>()
    for (const node of Object.values(nodes)) {
      const objectId = museumObjectId(node)
      if (!objectId) continue
      // The work's photo; else the asset's own picture (the default standee's).
      const src =
        photos.get(objectId) ?? (node as { asset?: { thumbnail?: string } }).asset?.thumbnail
      if (src) result.set(node.id, src)
    }
    return result
  }, [nodes, photos])
  useEffect(() => {
    let cancelled = false
    const ring = primaryColor()
    void Promise.all(
      [...sources].map(async ([id, src]) => [id, await roundPictureUrl(src, ring)] as const),
    ).then((entries) => {
      if (cancelled) return
      setPictures(new Map(entries.filter((entry): entry is [string, string] => Boolean(entry[1]))))
    })
    return () => {
      cancelled = true
    }
  }, [sources])
  return pictures
}

const PICTURE_CACHE = new Map<string, Promise<string | null>>()

function roundPictureUrl(src: string, ring: string): Promise<string | null> {
  const key = `${src}|${ring}`
  let picture = PICTURE_CACHE.get(key)
  if (!picture) {
    picture = fetch(src)
      .then((response) => (response.ok ? response.blob() : Promise.reject(response.status)))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          }),
      )
      .then((photo) => {
        const svg =
          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">` +
          `<defs><clipPath id="c"><circle cx="50" cy="50" r="46"/></clipPath></defs>` +
          `<circle cx="50" cy="50" r="46" fill="#ffffff"/>` +
          `<image href="${photo}" xlink:href="${photo}" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` +
          `<circle cx="50" cy="50" r="46" fill="none" stroke="${ring}" stroke-width="7"/></svg>`
        return `data:image/svg+xml,${encodeURIComponent(svg)}`
      })
      // No photo: the work keeps Pascal's own item symbol only.
      .catch(() => null)
    PICTURE_CACHE.set(key, picture)
  }
  return picture
}
