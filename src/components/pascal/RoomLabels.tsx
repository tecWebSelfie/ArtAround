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
 * Pascal itself picks (`polygonInteriorPoint`), lifted just above its floor.
 *
 * The labels are DOM (`Html`), so they keep one readable size at any zoom,
 * never take pointer events (the map stays draggable through them) and sit
 * below the navigation overlay (`zIndexRange`), which must stay on top.
 */

/** Metres above the room's floor: clear of the floor, below the artworks. */
const LABEL_HEIGHT = 0.15

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
      <span className="block rounded-full bg-(--mantine-color-body)/85 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-(--mantine-color-text) shadow-(--mantine-shadow-xs) select-none">
        {label.name}
      </span>
    </Html>
  ))
}
