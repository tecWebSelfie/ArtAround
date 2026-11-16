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
    <Html
      key={label.id}
      center
      position={[...label.position]}
      zIndexRange={[10, 0]}
      style={{ pointerEvents: 'none' }}
    >
      {/* A cartographic halo, not a box: the letters alone, ringed by the
          page color, so the name reads over any wall, floor or artwork
          while covering only its own strokes (a solid pill hid what stood
          behind it). Text color on body: full contrast in both themes. */}
      <span className="block text-sm leading-tight font-bold tracking-wide whitespace-nowrap text-(--mantine-color-text) select-none [text-shadow:0_0_1px_var(--mantine-color-body),0_0_2px_var(--mantine-color-body),0_0_3px_var(--mantine-color-body),0_0_4px_var(--mantine-color-body)]">
        {label.name}
      </span>
    </Html>
  ))
}
