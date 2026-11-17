'use client'

import { groundLevelId } from '@/lib/pascal/museum-plugin/marker-hierarchy'
import {
  PLAN_NODE_BASE,
  PLAN_WORK_NODE_TYPE,
  routePlanGeometry,
  visitorPlanGeometry,
} from '@/lib/pascal/museum-plugin/plan-overlay'
import { museumObjectId } from '@/lib/tour-navigation'
import { DEFAULT_PRIMARY } from '@/theme'
import { Box, Loader, useMantineTheme } from '@mantine/core'
import { type AnyNode, useScene } from '@pascal-app/core'
import type { Vec3 } from 'navcat'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Pascal's own read-only floor plan (`FloorplanPreview` from
 * `@pascal-app/editor`, the 2D half of its `ViewerStage`): the museum drawn
 * from every node's `floorplan()` builder, with pan and zoom (drag, pinch,
 * wheel). The 3D map stays mounted underneath, hidden and paused, because
 * routes and directions are computed on its meshes, as `ViewerStage` itself
 * keeps it. Loaded on the first switch only: the editor package is large.
 *
 * The scene handed to the plan is the live scene plus every work as a round
 * picture of its photo (`plan-overlay.ts`). It changes only when the museum
 * or the pictures do: each new scene makes `FloorplanPreview` refit its view,
 * which would undo the visitor's pan and zoom. What moves while walking, the
 * visitor and the route ahead, is drawn by `MovingLayer` instead, with
 * Pascal's own geometry renderer, in the plan's SVG: it follows pan, zoom
 * and rotation and never touches the scene.
 */
const FloorplanPreview = lazy(() =>
  import('@pascal-app/editor').then((module) => ({ default: module.FloorplanPreview })),
)
const FloorplanGeometryRenderer = lazy(() =>
  import('@pascal-app/editor').then((module) => ({
    default: module.FloorplanGeometryRenderer,
  })),
)

/** The map's view (see `useGuidanceSettings`): the 3D model or the floor plan. */
export type MapView = '3d' | '2d'

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
  const scene = usePlanScene(catalog, color)
  const loaded = useScene((state) => state.rootNodeIds.some((id) => roots.includes(id)))
  const frame = useRef<HTMLDivElement>(null)
  const sceneGroup = usePlanSceneGroup(frame, loaded)
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
            scene={scene}
            // The level the works are on (else Pascal shows the lowest one, a
            // basement).
            levelId={scene.levelId}
            showCompass={false}
            showLevelSelector={false}
          />
          {sceneGroup && (
            <MovingLayer scene={sceneGroup} position={position} path={path} color={color} />
          )}
        </Suspense>
      ) : (
        loader
      )}
    </Box>
  )
}

/**
 * The visitor and the route ahead, in plan coordinates, over the plan's own
 * geometry. Portaled into the plan's SVG after its scene group (so the view
 * box pans and zooms it too), with that group's rotation mirrored: Pascal
 * sets it as an attribute, outside React.
 */
function MovingLayer({
  scene,
  position,
  path,
  color,
}: {
  scene: SVGGElement
  position: Vec3 | null
  path: Vec3[] | null
  color: string
}) {
  const [transform, setTransform] = useState(() => scene.getAttribute('transform'))
  useEffect(() => {
    const mirror = () => setTransform(scene.getAttribute('transform'))
    mirror()
    const observer = new MutationObserver(mirror)
    observer.observe(scene, { attributes: true, attributeFilter: ['transform'] })
    return () => observer.disconnect()
  }, [scene])
  const route = path && path.length > 1 ? routePlanGeometry(path, color) : null
  return createPortal(
    <g pointerEvents="none" transform={transform ?? undefined}>
      {route && <FloorplanGeometryRenderer geometry={route} />}
      {position && <FloorplanGeometryRenderer geometry={visitorPlanGeometry(position, color)} />}
    </g>,
    scene.ownerSVGElement ?? scene,
  )
}

/**
 * The `<g>` of `FloorplanPreview`'s SVG that holds the plan's geometry (its
 * only direct group, carrying the view rotation). Found once the lazy plan
 * has rendered, and again if it is remounted.
 */
function usePlanSceneGroup(frame: React.RefObject<HTMLDivElement | null>, active: boolean) {
  const [group, setGroup] = useState<SVGGElement | null>(null)
  useEffect(() => {
    const root = frame.current
    if (!active || !root) return
    const find = () => {
      const next = root.querySelector<SVGGElement>('svg[data-floorplan-preview] > g')
      setGroup((current) => (current === next ? current : next))
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [frame, active])
  return active ? group : null
}

/** The live scene with every work's round picture on the ground level. */
function usePlanScene(
  catalog: readonly { id: string; thumbnail?: string | null }[],
  color: string,
) {
  const nodes = useScene((state) => state.nodes) as Record<string, AnyNode>
  const installedPlugins = useScene((state) => state.installedPlugins)
  const pictures = useRoundPictures(nodes, catalog, color)
  return useMemo(() => {
    const levelId = groundLevelId(nodes)
    if (!levelId || pictures.size === 0) return { nodes, installedPlugins, levelId }
    const works: string[] = []
    const next: Record<string, unknown> = { ...nodes }
    for (const [id, url] of pictures) {
      const node = nodes[id] as { position?: Vec3 } | undefined
      if (!node?.position) continue
      const [x, , z] = node.position
      const workId = `planWork_${id}`
      next[workId] = {
        ...PLAN_NODE_BASE,
        id: workId,
        type: PLAN_WORK_NODE_TYPE,
        parentId: levelId,
        position: [x, 0, z],
        url,
      }
      works.push(workId)
    }
    const level = nodes[levelId] as AnyNode & { children: string[] }
    next[levelId] = { ...level, children: [...level.children, ...works] }
    return { nodes: next as Record<string, AnyNode>, installedPlugins, levelId }
  }, [nodes, installedPlugins, pictures])
}

/**
 * Each placed work's round picture by node id: its photo from the catalog,
 * else its asset's own picture (the default standee's), in a ring of the
 * primary color. One that fails is left out (the work keeps Pascal's own
 * item symbol) and tried again on the next change.
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
  // All at once, so the plan is rebuilt once rather than per photo (a slow
  // one times out, see `photoDataUrl`); a work no longer placed is skipped by
  // `usePlanScene`.
  const [pictures, setPictures] = useState(() => new Map<string, string>())
  useEffect(() => {
    let cancelled = false
    const sources = JSON.parse(sourcesKey) as [string, string][]
    void Promise.all(sources.map(async ([id, src]) => [id, await photoDataUrl(src)] as const)).then(
      (entries) => {
        if (cancelled) return
        setPictures(
          new Map(
            entries.flatMap(([id, photo]) => (photo ? [[id, roundPictureUrl(photo, color)]] : [])),
          ),
        )
      },
    )
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
