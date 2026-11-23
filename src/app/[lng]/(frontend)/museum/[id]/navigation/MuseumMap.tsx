'use client'

import { Avatar, AVATAR_FACE_HEIGHT } from '@/components/pascal/Avatar'
import { useWalkTo } from '@/components/pascal/use-walk-to'
import { MapViewer } from '@/components/pascal/MapViewer'
import { MAP_LABEL_CLASS, MAP_LABEL_Z_RANGE, RoomLabels } from '@/components/pascal/RoomLabels'
import { collectMuseumMarkers } from '@/lib/pascal/museum-plugin/markers-in-map'
import { museumNavigationPath, objectNavigationPoint } from '@/lib/pascal/navigation'
import { museumObjectId, type NavigationDestination } from '@/lib/tour-navigation'
import { emitter, sceneRegistry, useScene, type ItemEvent } from '@pascal-app/core'
import { Html, useGLTF, type CameraControlsImpl } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import type { NavMesh, Vec3 } from 'navcat'
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { useTranslation } from 'react-i18next'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { Line2 } from 'three/addons/lines/webgpu/Line2.js'
import { Line2NodeMaterial } from 'three/webgpu'
import { Box3, Color, Vector3, type Object3D, type PerspectiveCamera } from 'three'
import { journeyView } from '@/lib/pascal/journey-view'
import { useMantineTheme } from '@mantine/core'
import { useViewer } from '@pascal-app/viewer'
import { usePathname } from 'next/navigation'

/** A destination flag is drawn at hero-glTF scale (~1.3 m); keep it knee-high. */
const DESTINATION_FLAG_SCALE = 0.7

/** How strongly Pascal's outline pass draws the works' outline (its editor uses 3). */
const WORK_OUTLINE_STRENGTH = 2

/** Metres from the avatar's face height up to its "You" label: clear of the head. */
const AVATAR_LABEL_GAP = 0.7

/**
 * Camera framing the journey (see `FrameJourney`): never closer than this to
 * its target, so the avatar reads clearly while the rooms around it still
 * read as a plan (metres; polar angle from the vertical, so ~50° looks down
 * at the floor plan at a slant).
 */
const AVATAR_VIEW_DISTANCE = 20
const AVATAR_VIEW_POLAR = 0.88
/** Metres of floor kept around the framed journey, so its ends never touch an edge. */
const JOURNEY_MARGIN = 2
/**
 * Pixels kept free beside the framed journey, so the labels centred on its
 * ends ("You", the destination's name, up to 12rem wide) stay on screen:
 * about half a label, never more than a fifth of a narrow canvas's width.
 */
const LABEL_GUTTER = { side: 96, sideShare: 0.2, top: 32 }

/** Metres from the floor up to the destination's label: above the flag (~0.9 m). */
const DESTINATION_LABEL_HEIGHT = 1.6

/**
 * The route line leaves the avatar from its edge instead of its centre,
 * where it would run through the body (metres, in plan).
 */
const PATH_START_CLEARANCE = 0.45

/**
 * The route from the pinned position (`at`: a work or an entrance; else, with a destination, the entrance guessed for a preview) to the
 * destination. `start` is the pin, never the live GPS position: the live
 * position and the part of the route ahead of it are derived from this in
 * `useRouteGuidance` and handed back to the map (`position`, `path`).
 */
export type MuseumRoute = {
  path: Vec3[] | null
  start: Vec3 | null
  end: Vec3 | null
  target: [number, number] | null
  /** Whether `start` is the visitor's confirmed position, not an entrance guessed for a preview. */
  confirmed: boolean
}

/** Plan centre [x, z] of a scene object, from its world bounds. */
function planCentre(object: Object3D): [number, number] {
  const centre = new Box3().setFromObject(object).getCenter(new Vector3())
  return [centre.x, centre.z]
}

/**
 * Connects Pascal's scene to tour semantics: clicks resolve by ItemNode asset ID,
 * while `at` / `to` / `service` / `exit` become navmesh positions for the
 * visitor's route. Services and entrances/exits are Pascal marker nodes, so the
 * route is resolved from their live meshes just like museum objects.
 */
export function MuseumMap({
  map,
  navMesh,
  currentObjectId,
  destination,
  onObjectClick,
  onRouteUnavailable,
  onStartEntranceChange,
  onRouteChange,
  position,
  path,
  destinationLabel,
  renderPaused,
  ...props
}: ComponentProps<typeof MapViewer> & {
  navMesh?: NavMesh | null
  currentObjectId?: string | null
  destination?: NavigationDestination | null
  onObjectClick?: (id: string) => void
  onRouteUnavailable?: (unavailable: boolean) => void
  /** Reports the entrance the route started from, so the progress bar mirrors it. */
  onStartEntranceChange?: (entranceId: string | null) => void
  /**
   * Reports the resolved route so the page can build directions from it:
   * the path, its start, and the destination's own plan centre [x, z]
   * (the path ends beside the destination, not inside it).
   */
  onRouteChange?: (route: MuseumRoute | null) => void
  /** The live position (pin moved by GPS) where the avatar stands; the pin if absent. */
  position?: Vec3 | null
  /** The route still ahead of the live position; the whole route if absent. */
  path?: Vec3[] | null
  /** Written over the destination's flag, e.g. "Stop 2 · Giotto signs his name". */
  destinationLabel?: string | null
}) {
  const [ready, setReady] = useState(false)
  const { t } = useTranslation('tour-navigation')
  // The outline in the museum's own colour (its primary, DESIGN.md → The
  // Museum Primary Rule), steady rather than pulsing like the editor's hover:
  // it marks what is a work, it doesn't call for attention. Pascal adds the
  // colour onto the scene, so the hidden edges (behind a wall) get black,
  // which adds nothing: only the visible outline shows.
  const museumColor = useMantineTheme().colors.museum?.[6]
  // The work open in the object modal, read here: router hooks belong
  // outside the 3D canvas.
  const openedObjectId = /\/object\/([^/]+)$/.exec(usePathname())?.[1] ?? null
  const workOutlineStyles = useMemo(
    () => ({
      default: {
        visibleColor: new Color(museumColor ?? '#228be6').getHex(),
        hiddenColor: 0x00_00_00,
        strength: WORK_OUTLINE_STRENGTH,
        pulse: false,
      },
    }),
    [museumColor],
  )
  useObjectClicks(onObjectClick)

  const route = useMemo(() => {
    if (!ready || !navMesh) return null
    const markers = collectMuseumMarkers(useScene.getState().nodes as Record<string, unknown>)

    // The map node stores the Payload object ID; resolve its live mesh so
    // navigation uses world-space bounds, including parent transforms.
    const point = (id: string | null | undefined) => {
      if (!id) return null
      const node = Object.values(useScene.getState().nodes).find(
        (node) => museumObjectId(node) === id,
      )
      const object = node && sceneRegistry.nodes.get(node.id)
      return object ? objectNavigationPoint(navMesh, object) : null
    }
    // Marker nodes are registered under their own id; a marker without a live
    // mesh (unplaced, or not rendered yet) simply has no routable point.
    const markerPoint = (nodeId: string) => {
      const object = sceneRegistry.nodes.get(nodeId)
      return object ? objectNavigationPoint(navMesh, object) : null
    }
    const toPoint = ({ id }: { id: string }) => markerPoint(id)
    const distance = (from: Vec3 | null, to: Vec3) =>
      from ? Math.hypot(from[0] - to[0], from[2] - to[2]) : 0
    /** Closest of the given markers, measured from the visitor's position. */
    const nearest = (ids: readonly string[], from: Vec3 | null) => {
      let best: { id: string; point: Vec3 } | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const id of ids) {
        const candidate = markerPoint(id)
        if (!candidate) continue
        const current = distance(from, candidate)
        if (current < bestDistance) {
          best = { id, point: candidate }
          bestDistance = current
        }
      }
      return best
    }

    const placedServices = markers.services.filter((node) => node.placed)
    const placedExits = markers.exitEntrances.filter((node) => node.placed)
    const placedEntrances = markers.exitEntrances.filter(
      (node) => node.placed && node.direction === 'entrance',
    )

    // `at` holds a work's id or, since a visitor may confirm they stand at
    // one of the museum's entrances, an entrance marker's node id.
    const confirmedEntrance = placedEntrances.find((node) => node.id === currentObjectId)
    const reference =
      point(currentObjectId) ?? (confirmedEntrance ? markerPoint(confirmedEntrance.id) : null)
    // A service button routes to the closest instance of that type (an exit
    // button, to the closest exit); spotlight entries carry the exact node id
    // and win over the "closest" fallback.
    const routeEnd = () => {
      if (!destination) return null
      if (destination.kind === 'object') return point(destination.id)
      const [placed, candidates] =
        destination.kind === 'service'
          ? [placedServices, placedServices.filter((node) => node.service === destination.target)]
          : [placedExits, placedExits]
      if (placed.some((node) => node.id === destination.target)) {
        return toPoint({ id: destination.target })
      }
      return (
        nearest(
          candidates.map((node) => node.id),
          reference,
        )?.point ?? null
      )
    }
    const end = routeEnd()

    // Without a confirmed `at`, a route to a destination is previewed from an
    // entrance: the closest one to where the visitor is heading. It is only a
    // guess (drawn as such: a ghost avatar and a dashed line), derived, never
    // written back to the URL. With no destination there is nothing to
    // preview, and a museum with several entrances gives no basis to pick one:
    // no avatar is drawn until the visitor says where they are.
    const entrance =
      reference || !end
        ? null
        : nearest(
            placedEntrances.map((node) => node.id),
            end,
          )
    const start = reference ?? entrance?.point ?? null
    // Directions say which side an object stands on, so they need the object's
    // own centre; markers (services, exits) are small enough to be "ahead".
    const targetNode =
      destination?.kind === 'object'
        ? Object.values(useScene.getState().nodes).find(
            (node) => museumObjectId(node) === destination.id,
          )
        : null
    const targetObject = targetNode && sceneRegistry.nodes.get(targetNode.id)
    return {
      start,
      end,
      target: targetObject ? planCentre(targetObject) : null,
      confirmed: Boolean(reference),
      startEntranceId: reference ? (confirmedEntrance?.id ?? null) : (entrance?.id ?? null),
      path: start && end ? museumNavigationPath(navMesh, start, end) : null,
    }
  }, [ready, navMesh, currentObjectId, destination])

  useEffect(() => {
    onRouteChange?.(
      route
        ? {
            path: route.path,
            start: route.start,
            end: route.end,
            target: route.target,
            confirmed: route.confirmed,
          }
        : null,
    )
  }, [route, onRouteChange])

  const startEntranceId = route?.startEntranceId ?? null
  useEffect(() => {
    onStartEntranceChange?.(startEntranceId)
  }, [startEntranceId, onStartEntranceChange])

  useEffect(() => {
    onRouteUnavailable?.(Boolean(route?.start && route.end && !route.path))
  }, [route, onRouteUnavailable])

  const shownPath = path ?? route?.path
  return (
    <MapViewer
      map={map}
      {...props}
      // Paused only once the scene is built: routes are computed on its
      // meshes, so a map opened under the floor plan still draws them once.
      renderPaused={Boolean(renderPaused) && ready}
      selectionManager="custom"
      onSceneReadyChange={setReady}
      hoverStyles={workOutlineStyles}
    >
      {/* Every work outlined, so artworks stand apart from walls and
          furniture at a glance. */}
      {ready && <WorkOutlines opened={openedObjectId} />}
      {route?.start && (
        // The avatar stands at the live position: the pin (last explicitly
        // confirmed position) moved by the GPS. A start that is only a
        // guess (an entrance, to preview a route) is a ghost asking whether
        // the visitor is there: a "you are here" must never be ambiguous.
        <WalkingAvatar
          point={position ?? route.start}
          label={route.confirmed ? t('You') : t('Are you here?')}
          ghost={!route.confirmed}
        />
      )}
      {/* The camera follows the route, not every GPS step: re-centring on
          each fix would fight the visitor's own panning. */}
      {route && <FrameJourney route={route} />}
      {/* Room names over the plan, once the scene (and its zones) is ready. */}
      {ready && <RoomLabels />}
      {route?.end && (
        // The flag marks the chosen destination (object, service, or exit).
        <group position={route.end}>
          <Suspense fallback={null}>
            <DestinationFlag />
          </Suspense>
          {destinationLabel && <DestinationLabel label={destinationLabel} />}
        </group>
      )}
      {shownPath && shownPath.length > 1 && (
        <NavigationPath
          points={trimPathStart(shownPath, PATH_START_CLEARANCE)}
          preview={!route?.confirmed}
        />
      )}
    </MapViewer>
  )
}

/**
 * Outlines every work on the map with Pascal's own outline pass (the one its
 * editor draws around a hovered node), so no shader of ours is involved: the
 * works' scene objects go into the viewer's `outliner.hoveredObjects` and
 * `hoverStyles` (above) sets the look. The visitor map has no hover of its
 * own (`selectionManager="custom"`), so the list is ours alone.
 *
 * The work under the pointer and the one open in a modal (`…/object/ID`)
 * move to Pascal's other list, `selectedObjects`: its selection outline,
 * thicker and in Pascal's fixed colours (white, yellow behind walls), so the
 * work the visitor is pointing at or reading stands out from the rest.
 *
 * Pascal empties both lists whenever it rebuilds its pipeline (a new scene,
 * a lost GPU device), so they are refilled on the next frame when they no
 * longer match; checking length and first entry is enough for that.
 * Without WebGPU Pascal draws no post-processing and the works stay plain.
 */
function WorkOutlines({ opened }: { opened: string | null }) {
  const nodes = useScene((state) => state.nodes)
  const hovered = useHoveredWork()
  const { plain, focused } = useMemo(() => {
    const lists = { plain: [] as Object3D[], focused: [] as Object3D[] }
    for (const node of Object.values(nodes)) {
      const id = museumObjectId(node)
      const object = id ? sceneRegistry.nodes.get(node.id) : undefined
      if (!object) continue
      lists[node.id === hovered || id === opened ? 'focused' : 'plain'].push(object)
    }
    return lists
  }, [nodes, hovered, opened])
  useFrame(() => {
    const { outliner } = useViewer.getState()
    syncOutlined(outliner.hoveredObjects, plain)
    syncOutlined(outliner.selectedObjects, focused)
  })
  useEffect(
    () => () => {
      const { outliner } = useViewer.getState()
      outliner.hoveredObjects.length = 0
      outliner.selectedObjects.length = 0
    },
    [],
  )
  return null
}

/**
 * Pascal's outline list made to hold `objects`, rewritten only when it
 * differs. Item by item: moving from one work to another often keeps the
 * length and the first item while the works change.
 */
function syncOutlined(list: Object3D[], objects: Object3D[]) {
  if (list.length === objects.length && list.every((object, i) => object === objects[i])) return
  list.length = 0
  list.push(...objects)
}

/** The scene id of the work under the pointer (Pascal's `item:enter`/`leave`), if any. */
function useHoveredWork() {
  const [hovered, setHovered] = useState<string | null>(null)
  useEffect(() => {
    const enter = ({ node }: ItemEvent) => {
      if (museumObjectId(node)) setHovered(node.id)
    }
    const leave = ({ node }: ItemEvent) => {
      setHovered((current) => (current === node.id ? null : current))
    }
    emitter.on('item:enter', enter)
    emitter.on('item:leave', leave)
    return () => {
      emitter.off('item:enter', enter)
      emitter.off('item:leave', leave)
    }
  }, [])
  return hovered
}

/**
 * The avatar carried to `point` at walking pace (`useWalkTo`), facing the
 * way it walks.
 */
function WalkingAvatar({ point, label, ghost }: { point: Vec3; label: string; ghost: boolean }) {
  const { group, heading } = useWalkTo(point)
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <Avatar heading={heading} ghost={ghost} />
      </Suspense>
      {/* "You": a map's "you are here", so a visitor landing on a shared or
          QR link finds themselves at a glance among the room names. Same
          halo as the room labels (see `RoomLabels`), in the museum color so
          it never reads as one of them; it walks with the avatar. */}
      <Html
        center
        position={[0, AVATAR_FACE_HEIGHT + AVATAR_LABEL_GAP, 0]}
        zIndexRange={MAP_LABEL_Z_RANGE}
        style={{ pointerEvents: 'none' }}
      >
        <span
          className={`${MAP_LABEL_CLASS} text-[light-dark(var(--mantine-color-museum-8),var(--mantine-color-museum-4))]`}
        >
          {label}
        </span>
      </Html>
    </group>
  )
}

/**
 * Moves the camera to show the visitor's journey whenever the route changes:
 * entering the museum or a tour, confirming a position, choosing another
 * destination, advancing a stop. The start, the route and the destination
 * are framed together inside the part of the canvas the header and the
 * controls leave free (`journeyView`), so the visitor sees at once where
 * they are, where they are going and the way between. With only one end
 * (a position and no destination, or a destination and no start) that end
 * is centred from `AVATAR_VIEW_DISTANCE`. Nothing to show leaves the camera on
 * the whole museum, as `MapViewer` framed it.
 *
 * Only a new route moves the camera, never a GPS step of the live position
 * (the route object is memoized on the pin and the destination), so it never
 * fights the visitor's own panning; a resized canvas reframes the same route
 * only until the visitor moves the camera. The compass direction is kept, so the
 * map does not spin; reduced motion makes the move a cut.
 */
function FrameJourney({
  route,
}: {
  route: { start: Vec3 | null; end: Vec3 | null; path: Vec3[] | null }
}) {
  const controls = useThree((state) => state.controls) as CameraControlsImpl | null
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const canvas = useThree((state) => state.gl.domElement)
  const { width, height } = useThree((state) => state.size)
  // Whether the visitor moved the camera since the journey was framed
  // (camera-controls' `controlstart` fires on their input only).
  const touched = useRef(false)
  const framed = useRef<typeof route | null>(null)
  useEffect(() => {
    if (!controls) return
    const touch = () => {
      touched.current = true
    }
    controls.addEventListener('controlstart', touch)
    return () => controls.removeEventListener('controlstart', touch)
  }, [controls])
  useEffect(() => {
    if (!controls) return
    // A new route is always framed. A resized canvas (the strip below
    // growing or shrinking, a phone turned) frames it again only while the
    // visitor has not moved the camera: the vertical field of view is fixed,
    // so a taller canvas sees less to the sides and would cut the journey.
    if (framed.current === route && touched.current) return
    framed.current = route
    touched.current = false
    const ends = [route.start, route.end].filter((point): point is Vec3 => Boolean(point))
    const points = route.path && route.path.length > 1 ? route.path : ends
    const bounds = canvas.getBoundingClientRect()
    const insets = overlayInsets(bounds)
    const side = Math.min(LABEL_GUTTER.side, bounds.width * LABEL_GUTTER.sideShare)
    const view = journeyView({
      points,
      fov: camera.fov ?? 50,
      width,
      height,
      insets: {
        top: insets.top + LABEL_GUTTER.top,
        bottom: insets.bottom,
        left: insets.left + side,
        right: insets.right + side,
      },
      azimuth: controls.azimuthAngle,
      polar: AVATAR_VIEW_POLAR,
      margin: JOURNEY_MARGIN,
      minDistance: AVATAR_VIEW_DISTANCE,
    })
    if (!view) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    void controls.setLookAt(...view.position, ...view.target, smooth)
  }, [controls, camera, canvas, route, width, height])
  return null
}

/**
 * How far the UI drawn over the map reaches into the canvas on each side:
 * the elements marked `data-map-overlay="top" | "bottom" | "left" | "right"`
 * (the navigation header, the controls' bottom row). Measured at the moment
 * of framing, so a wrapped title or a larger text size is taken into account.
 */
function overlayInsets(canvas: DOMRect) {
  const insets = { top: 0, bottom: 0, left: 0, right: 0 }
  for (const element of document.querySelectorAll<HTMLElement>('[data-map-overlay]')) {
    const box = element.getBoundingClientRect()
    if (!box.width || !box.height) continue
    const side = element.dataset.mapOverlay
    if (side === 'top') insets.top = Math.max(insets.top, box.bottom - canvas.top)
    if (side === 'bottom') insets.bottom = Math.max(insets.bottom, canvas.bottom - box.top)
    if (side === 'left') insets.left = Math.max(insets.left, box.right - canvas.left)
    if (side === 'right') insets.right = Math.max(insets.right, canvas.right - box.left)
  }
  return insets
}

/**
 * The destination's name over its flag, so the flag answers "where am I
 * going?" by itself. A map label like "You" and the room names (text with a
 * halo, never a box), in the text color: the museum color is the visitor's.
 */
function DestinationLabel({ label }: { label: string }) {
  return (
    <Html
      center
      position={[0, DESTINATION_LABEL_HEIGHT, 0]}
      zIndexRange={MAP_LABEL_Z_RANGE}
      style={{ pointerEvents: 'none' }}
    >
      <span
        data-testid="destination-label"
        className={`${MAP_LABEL_CLASS} max-w-[12rem] truncate text-(--mantine-color-text)`}
      >
        {label}
      </span>
    </Html>
  )
}

/**
 * The destination flag with its lowest point on the floor: the model's
 * origin is not at its base, so drawn as is its pole sank into the floor.
 */
function DestinationFlag() {
  const { scene } = useGLTF('/models/flag.glb')
  const model = useMemo(() => scene.clone(), [scene])
  const lift = useMemo(() => -new Box3().setFromObject(model).min.y, [model])
  return (
    <group scale={DESTINATION_FLAG_SCALE}>
      <primitive object={model} position-y={lift} />
    </group>
  )
}

/**
 * Cuts the first `clearance` metres (in plan) off a route, so the line starts
 * at the avatar's edge. A route shorter than that is kept as it is.
 */
function trimPathStart(points: Vec3[], clearance: number): Vec3[] {
  let left = clearance
  for (let index = 1; index < points.length; index++) {
    const [ax, ay, az] = points[index - 1]
    const [bx, by, bz] = points[index]
    const length = Math.hypot(bx - ax, bz - az)
    if (length > left) {
      const t = left / length
      const cut: Vec3 = [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t]
      return [cut, ...points.slice(index)]
    }
    left -= length
  }
  return points
}

/** Pascal uses WebGPURenderer; Drei's WebGL LineMaterial cannot render here. */
const PathLine = extend(Line2)
const PathGeometry = extend(LineGeometry)
const PathMaterial = extend(Line2NodeMaterial)

/**
 * The route line. A `preview` (from a guessed entrance, before the visitor
 * says where they are) is dashed, as a planned rather than a followed route.
 */
function NavigationPath({
  points,
  preview,
}: {
  points: [number, number, number][]
  preview: boolean
}) {
  const line = useRef<Line2>(null)
  const geometry = useRef<LineGeometry>(null)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    // A URL-only destination change keeps this geometry mounted. Update its
    // vertices explicitly: onUpdate alone doesn't react to a changed callback.
    // Show guidance at 80% of the avatar's displayed height, near its face.
    geometry.current?.setPositions(points.flatMap(([x, y, z]) => [x, y + AVATAR_FACE_HEIGHT, z]))
    // Dashes are laid out along the line's own distances.
    if (preview) line.current?.computeLineDistances()
    invalidate()
  }, [points, preview, invalidate])

  return (
    <PathLine ref={line} name="museum-navigation-path" renderOrder={1000}>
      <PathGeometry ref={geometry} />
      {/* Keyed on `preview`: a node material builds its shader once, so
          switching dashes on or off takes a new material. Dashes in metres. */}
      <PathMaterial
        key={preview ? 'preview' : 'route'}
        color="#228be6"
        linewidth={5}
        depthTest={false}
        depthWrite={false}
        dashed={preview}
        dashSize={0.6}
        gapSize={0.4}
      />
    </PathLine>
  )
}

/**
 * Pascal emits item clicks for every selectable node; the shared ID helper
 * filters these to museum objects, leaving walls and map geometry untouched.
 */
function useObjectClicks(onObjectClick?: (id: string) => void) {
  useEffect(() => {
    const select = ({ node, stopPropagation }: ItemEvent) => {
      const id = museumObjectId(node)
      if (id) {
        stopPropagation()
        onObjectClick?.(id)
      }
    }
    emitter.on('item:click', select)
    return () => {
      emitter.off('item:click', select)
    }
  }, [onObjectClick])
}
