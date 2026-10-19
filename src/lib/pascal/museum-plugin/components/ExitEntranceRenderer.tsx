'use client'

import { useLiveNodeOverrides, useLiveTransforms, useRegistry } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import type { z } from 'zod'
import { EXIT_ENTRANCE_META } from '../markers'
import type { ExitEntranceNode } from '../ExitEntranceNode'
import { TintedModel } from './MarkerModel'

/** The GLB is authored at a ~5 m footprint; shrink it to a floor-plaque marker. */
const EXIT_ENTRANCE_SCALE = 0.3
const BADGE_HEIGHT = 1.1

/**
 * Entrance / exit marker: the shared exhibit plate recolored per direction
 * (blue entrance, light red exit) plus a floating icon badge.
 */
export default function ExitEntranceRenderer({
  node,
}: {
  node: z.infer<typeof ExitEntranceNode>
}) {
  // A custom renderer owns its transform; folding the live transform/override in
  // keeps drag-to-move smooth instead of snapping only on commit. The ref is
  // declared non-null so it satisfies both `useRegistry` and the group ref.
  const ref = useRef<THREE.Group>(null!)
  useRegistry(node.id, node.type, ref)
  const live = useLiveTransforms((state) => state.get(node.id))
  const override = useLiveNodeOverrides((state) => state.get(node.id))
  const effectiveNode = useMemo(
    () => (override ? ({ ...node, ...override } as typeof node) : node),
    [node, override],
  )
  const position = live?.position ?? effectiveNode.position
  const { Icon, hex, label } = EXIT_ENTRANCE_META[effectiveNode.direction]

  return (
    <group ref={ref} position={position} visible={node.visible !== false}>
      <TintedModel url="/models/exitEntrance.glb" color={hex} scale={EXIT_ENTRANCE_SCALE} />
      <Html
        center
        position={[0, BADGE_HEIGHT, 0]}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[20, 0]}
      >
        <span
          aria-label={label}
          className="flex size-6 items-center justify-center rounded-full text-white shadow"
          style={{ background: hex }}
          title={label}
        >
          <Icon size={14} aria-hidden />
        </span>
      </Html>
    </group>
  )
}
