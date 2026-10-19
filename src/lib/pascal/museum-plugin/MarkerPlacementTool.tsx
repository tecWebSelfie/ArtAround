'use client'

import { emitter, type AnyNode, type AnyNodeId, type GridEvent, useScene } from '@pascal-app/core'
import { CursorSphere, useEditor, useRegistryToolContext } from '@pascal-app/editor'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { EXIT_ENTRANCE_NODE_TYPE, ExitEntranceNode } from './ExitEntranceNode'
import {
  EXIT_ENTRANCE_META,
  SERVICE_META,
  isExitEntranceDirection,
  isServiceType,
} from './markers'
import { SERVICE_NODE_TYPE, ServiceNode } from './ServiceNode'

/**
 * `setToolDefaults` seeds a new marker with its service type or direction, or
 * identifies a legacy unplaced service that needs its first map position.
 */
type MarkerToolDefaults = { nodeId?: string; service?: string; direction?: string }

/**
 * One placement tool for both marker kinds, because their definitions share
 * `tool`. Zero-prop, like every registry tool; it reads the armed kind from the
 * editor store and creates a marker on `grid:click`. Placed markers move
 * through Pascal's generic surface-aware mover; this tool handles only initial
 * placement, including legacy service nodes without coordinates.
 *
 * Markers are authored at the scene root with world coordinates: museum
 * buildings sit at the origin, so world positions are also the plan positions
 * used by `floorplan`.
 */
export default function MarkerPlacementTool() {
  const tool = useEditor((state) => state.tool)
  const defaults = useEditor((state) =>
    tool ? (state.toolDefaults[tool] as MarkerToolDefaults | undefined) : undefined,
  )
  const cursorRef = useRef<Group>(null)
  const { selectNode } = useRegistryToolContext()

  const isService = tool === SERVICE_NODE_TYPE
  const service = isServiceType(defaults?.service) ? defaults.service : 'infoPoint'
  const direction = isExitEntranceDirection(defaults?.direction) ? defaults.direction : 'entrance'
  const marker = isService ? SERVICE_META[service] : EXIT_ENTRANCE_META[direction]

  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      cursorRef.current?.position.set(event.position[0], event.position[1], event.position[2])
    }

    const onGridClick = (event: GridEvent) => {
      const scene = useScene.getState()
      const editor = useEditor.getState()
      const armed = editor.tool
      const current =
        (armed ? (editor.toolDefaults[armed] as MarkerToolDefaults | undefined) : undefined) ?? {}

      // The shared React tool can only mutate nodes while one of its two kinds
      // is armed; stale defaults from another editor tool must be ignored.
      if (armed !== SERVICE_NODE_TYPE && armed !== EXIT_ENTRANCE_NODE_TYPE) return

      // Legacy services can exist without a usable position, so give them a
      // first position here; all later movement uses Pascal's generic mover.
      if (current.nodeId) {
        scene.updateNode(current.nodeId as AnyNodeId, {
          position: event.position,
          placed: true,
        } as Partial<AnyNode>)
        selectNode(current.nodeId as AnyNodeId)
        useEditor.getState().armToolMode({ mode: 'select' })
        return
      }

      const node =
        armed === SERVICE_NODE_TYPE
          ? ServiceNode.parse({
              position: event.position,
              service: isServiceType(current.service) ? current.service : 'infoPoint',
              placed: true,
            })
          : ExitEntranceNode.parse({
              position: event.position,
              direction: isExitEntranceDirection(current.direction)
                ? current.direction
                : 'entrance',
              placed: true,
            })
      scene.createNode(node as unknown as AnyNode)
      selectNode(node.id as AnyNodeId)
      useEditor.getState().armToolMode({ mode: 'select' })
    }

    emitter.on('grid:move', onGridMove)
    emitter.on('grid:click', onGridClick)
    return () => {
      emitter.off('grid:move', onGridMove)
      emitter.off('grid:click', onGridClick)
    }
  }, [selectNode])

  if (!tool) return null

  return (
    <CursorSphere
      ref={cursorRef}
      color={marker.hex}
      tooltipContent={<marker.Icon size={20} color="#ffffff" />}
    />
  )
}
