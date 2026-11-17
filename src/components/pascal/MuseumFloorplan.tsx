'use client'

import { groundLevelId } from '@/lib/pascal/museum-plugin/marker-hierarchy'
import {
  PLAN_NODE_BASE,
  PLAN_ROUTE_NODE_TYPE,
  PLAN_VISITOR_NODE_TYPE,
  PLAN_WORK_NODE_TYPE,
} from '@/lib/pascal/museum-plugin/plan-overlay'
import { museumObjectId } from '@/lib/tour-navigation'
import { DEFAULT_PRIMARY } from '@/theme'
import { Box, Loader, useMantineTheme } from '@mantine/core'
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
 * The scene changes only when what it shows changes (by value), and the plan
 * refits only when its framing does (our `FloorplanPreview` patch), so the
 * visitor's pan and zoom survive the walk.
 */
const FloorplanPreview = lazy(() =>
  import('@pascal-app/editor').then((module) => ({ default: module.FloorplanPreview })),
)

/** The map's view (see `useGuidanceSettings`): the 3D model or the floor plan. */
export type MapView = '3d' | '2d'

export function MuseumFloorplan({
  position,
  path,
  catalog,
}: {
  /** The tour's works: their photos become the round pictures. */
  catalog: readonly { id: string; thumbnail?: string | null }[]
  /** Where the avatar stands: the live position, else the route's start. */
  position: Vec3 | null
  /** The route still ahead. */
  path: Vec3[] | null
}) {
  // The museum's primary (blue, or the museum's own in museum mode).
  const color = useMantineTheme().colors.museum?.[6] ?? DEFAULT_PRIMARY[6]
  const scene = usePlanScene(position, path, catalog, color)
  return (
    // The zoom buttons would sit under the map's control dock: off, as pinch
    // and wheel zoom remain. The compass and the floor picker are off too
    // (museums have one floor).
    <Box pos="absolute" inset={0} className="bg-(--mantine-color-body)">
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
          showZoomControls={false}
        />
      </Suspense>
    </Box>
  )
}

/** The same value until its JSON changes: a new array with equal points keeps the scene. */
function useByValue<T>(value: T): T {
  const key = JSON.stringify(value)
  return useMemo(() => JSON.parse(key) as T, [key])
}

/** The live scene with the plan-only nodes on the ground level. */
function usePlanScene(
  position: Vec3 | null,
  path: Vec3[] | null,
  catalog: readonly { id: string; thumbnail?: string | null }[],
  color: string,
) {
  const nodes = useScene((state) => state.nodes) as Record<string, AnyNode>
  const installedPlugins = useScene((state) => state.installedPlugins)
  const pictures = useRoundPictures(nodes, catalog, color)
  const here = useByValue(position)
  const ahead = useByValue(path && path.length > 1 ? path : null)
  return useMemo(() => {
    const levelId = groundLevelId(nodes)
    if (!levelId) return { nodes, installedPlugins }
    const overlay: Record<string, unknown>[] = []
    for (const [id, url] of pictures) {
      const node = nodes[id] as { position?: Vec3 } | undefined
      if (!node?.position) continue
      const [x, , z] = node.position
      overlay.push({ id: `planWork_${id}`, type: PLAN_WORK_NODE_TYPE, position: [x, 0, z], url })
    }
    if (ahead) {
      overlay.push({ id: 'planRoute_visitor', type: PLAN_ROUTE_NODE_TYPE, points: ahead, color })
    }
    if (here) {
      overlay.push({ id: 'planVisitor_you', type: PLAN_VISITOR_NODE_TYPE, position: here, color })
    }
    const next: Record<string, unknown> = { ...nodes }
    for (const node of overlay) {
      next[node.id as string] = { ...PLAN_NODE_BASE, parentId: levelId, ...node }
    }
    const level = nodes[levelId] as AnyNode & { children: string[] }
    next[levelId] = { ...level, children: [...level.children, ...overlay.map((node) => node.id)] }
    return { nodes: next as Record<string, AnyNode>, installedPlugins }
  }, [nodes, installedPlugins, pictures, here, ahead, color])
}

/**
 * Each placed work's round picture by node id: its photo from the catalog,
 * else its asset's own picture (the default standee's), in a ring of the
 * primary color. Pictures appear as they load; one that fails is left out (the
 * work keeps Pascal's own item symbol) and tried again on the next change.
 */
function useRoundPictures(
  nodes: Record<string, AnyNode>,
  catalog: readonly { id: string; thumbnail?: string | null }[],
  color: string,
) {
  // "node id → photo url" as a string, so a scene refresh with the same works
  // and photos neither refetches nor changes the plan.
  const sourcesKey = useMemo(() => {
    const photos = new Map(catalog.map((object) => [object.id, object.thumbnail]))
    const entries: [string, string][] = []
    for (const node of Object.values(nodes)) {
      const objectId = museumObjectId(node)
      if (!objectId) continue
      const src =
        photos.get(objectId) ?? (node as { asset?: { thumbnail?: string } }).asset?.thumbnail
      if (src) entries.push([node.id, src])
    }
    return JSON.stringify(entries)
  }, [nodes, catalog])
  // Pictures arrive one by one and replace their older version (another ring
  // color); a work no longer placed is skipped by `usePlanScene`.
  const [pictures, setPictures] = useState(() => new Map<string, string>())
  useEffect(() => {
    let cancelled = false
    const sources = JSON.parse(sourcesKey) as [string, string][]
    for (const [id, src] of sources) {
      void photoDataUrl(src).then((photo) => {
        if (cancelled || !photo) return
        setPictures((current) => new Map(current).set(id, roundPictureUrl(photo, color)))
      })
    }
    return () => {
      cancelled = true
    }
  }, [sourcesKey, color])
  return pictures
}

/** Photos as data URLs by src, shared by every plan of the session. */
const PHOTO_CACHE = new Map<string, Promise<string | null>>()

/**
 * The photo as a data URL: an SVG used as an image may not load anything
 * external, so the round picture embeds it. A failure is not cached.
 */
function photoDataUrl(src: string): Promise<string | null> {
  let photo = PHOTO_CACHE.get(src)
  if (!photo) {
    photo = fetch(src, { signal: AbortSignal.timeout(15_000) })
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
      .catch(() => {
        PHOTO_CACHE.delete(src)
        return null
      })
    PHOTO_CACHE.set(src, photo)
  }
  return photo
}

/** The photo cropped to a circle with a ring of `ring` color, as an SVG data URL. */
function roundPictureUrl(photo: string, ring: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="c"><circle cx="50" cy="50" r="46"/></clipPath></defs>` +
    `<circle cx="50" cy="50" r="46" fill="#ffffff"/>` +
    `<image href="${photo}" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` +
    `<circle cx="50" cy="50" r="46" fill="none" stroke="${ring}" stroke-width="7"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
