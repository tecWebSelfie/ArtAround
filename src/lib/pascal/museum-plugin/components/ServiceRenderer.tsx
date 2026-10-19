'use client'

import { useLiveNodeOverrides, useLiveTransforms, useRegistry } from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import type { z } from 'zod'
import { SERVICE_META } from '../markers'
import type { ServiceNode } from '../ServiceNode'

const RING_INNER = 0.28
const RING_OUTER = 0.45
const PIN_HEIGHT = 1.5
const BADGE_HEIGHT = PIN_HEIGHT + 0.28

/**
 * Service marker: a floor ring + pin tinted by service type, with the same
 * lucide icon the museum page badges use. Services are analysis nodes, so the
 * geometry is decorative only and never becomes a collider.
 */
export default function ServiceRenderer({ node }: { node: z.infer<typeof ServiceNode> }) {
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
  const { Icon, hex, label } = SERVICE_META[effectiveNode.service]

  return (
    <group ref={ref} position={position} visible={node.visible !== false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[RING_INNER, RING_OUTER, 32]} />
        <meshBasicMaterial
          color={hex}
          transparent
          opacity={effectiveNode.placed ? 0.95 : 0.5}
        />
      </mesh>
      <mesh position={[0, PIN_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, PIN_HEIGHT, 8]} />
        <meshBasicMaterial color={hex} transparent opacity={effectiveNode.placed ? 0.9 : 0.4} />
      </mesh>
      <Html
        center
        position={[0, BADGE_HEIGHT, 0]}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[20, 0]}
      >
        <span
          aria-label={label}
          className="flex size-6 items-center justify-center rounded-full text-white shadow"
          style={{ background: hex, opacity: effectiveNode.placed ? 1 : 0.55 }}
          title={label}
        >
          <Icon size={14} aria-hidden />
        </span>
      </Html>
    </group>
  )
}
