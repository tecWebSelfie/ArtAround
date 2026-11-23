'use client'

import { polygonInteriorPoint, sceneRegistry, useScene } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'

/**
 * Room names floating over the visitor's map, so the plan reads at a glance
 * ("East hall", "Room 6") as the directions name them.
 *
 * Pascal's editor has its own room pills (`RoomLabels` in
 * `@pascal-app/editor`), but they are bound to the editor's selection and
 * tool stores; this is the visitor's read-only version built from the same
 * parts: each named zone (Pascal's room) gets a label at the interior point
 * Pascal itself picks (`polygonInteriorPoint`), floating above its floor.
 *
 * The labels are DOM (`Html`), so they keep one readable size at any zoom,
 * never take pointer events (the map stays draggable through them) and sit
 * below the navigation overlay (`zIndexRange`), which must stay on top.
 */

/**
 * Metres above the room's floor: the name floats mid-air in the room, above
 * the visitors' heads and the artworks and below the top of the walls, as
 * map labels usually do, instead of lying on the floor among the objects.
 */
const LABEL_HEIGHT = 2.2

/**
 * The look of every DOM label floating over the visitor's map (room names,
 * the avatar's "You"): a cartographic halo, not a box. The letters alone,
 * ringed by the page color, read over any wall, floor or artwork while
 * covering only their own strokes (a solid pill hid what stood behind it).
 * Callers add the text color.
 */
const MAP_LABEL_CLASS =
  'block text-sm leading-tight font-bold whitespace-nowrap select-none [text-shadow:0_0_1px_var(--mantine-color-body),0_0_2px_var(--mantine-color-body),0_0_3px_var(--mantine-color-body),0_0_4px_var(--mantine-color-body)]'

/**
 * drei `Html`'s z-index range for map labels: under the navigation's
 * controls layer (z-20 in `TourNavigation`), which must stay on top.
 */
const MAP_LABEL_Z_RANGE: [number, number] = [10, 0]

/**
 * One label over the map at `position` (metres): text with the halo above,
 * in the color its caller gives (`className`). Room names, the avatar's
 * "You" and the destination's name all use it.
 */
export function MapLabel({
  position,
  className,
  children,
}: {
  position: [number, number, number]
  className: string
  children: React.ReactNode
}) {
  return (
    <Html
      center
      position={position}
      zIndexRange={MAP_LABEL_Z_RANGE}
      style={{ pointerEvents: 'none' }}
    >
      <span className={`${MAP_LABEL_CLASS} ${className}`}>{children}</span>
    </Html>
  )
}

export function RoomLabels() {
  const nodes = useScene((state) => state.nodes)
  const labels = useMemo(
    () =>
      Object.values(nodes).flatMap((node) => {
        if (node.type !== 'zone' || !node.name?.trim() || node.polygon.length < 3) return []
        const [x, z] = polygonInteriorPoint({ polygon: node.polygon })
        // The zone's own object carries its level's elevation (0 when not rendered yet).
        const floor = sceneRegistry.nodes.get(node.id)?.getWorldPosition(new Vector3()).y ?? 0
        return [{ id: node.id, name: node.name, position: [x, floor + LABEL_HEIGHT, z] as const }]
      }),
    [nodes],
  )

  return labels.map((label) => (
    // Text color on body: full contrast in both themes.
    <MapLabel
      key={label.id}
      position={[...label.position]}
      className="tracking-wide text-(--mantine-color-text)"
    >
      {label.name}
    </MapLabel>
  ))
}
