import type { NodeDefinition } from '@pascal-app/core'
import { EXIT_ENTRANCE_META } from './markers'
import { EXIT_ENTRANCE_NODE_TYPE, ExitEntranceNode } from './ExitEntranceNode'

/**
 * Entrance / exit marker. Like services it is an `analysis` node: a pure
 * position marker that never collides with visitors or the navmesh.
 */
export const ExitEntranceDefinition: NodeDefinition<typeof ExitEntranceNode> = {
  kind: EXIT_ENTRANCE_NODE_TYPE,
  schema: ExitEntranceNode,
  schemaVersion: 1,
  category: 'analysis',
  floorplan: (node) => ({
    kind: 'circle',
    cx: node.position[0],
    cy: node.position[2],
    r: 0.35,
    fill: EXIT_ENTRANCE_META[node.direction].hex,
    fillOpacity: 0.85,
    stroke: '#ffffff',
    strokeWidth: 0.04,
  }),
  renderer: {
    kind: 'parametric',
    module: () => import('./components/ExitEntranceRenderer'),
  },
  capabilities: {
    movable: {
      axes: ['x', 'y', 'z'],
      directDrag: true,
    },
    selectable: {
      hitVolume: 'bbox',
    },
    deletable: true,
    duplicable: false,
  },
  tool: () => import('./MarkerPlacementTool'),
  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    direction: 'entrance',
    placed: false,
  }),
  mcp: {
    description: 'A museum entrance or exit marker used as a tour start point or route destination.',
  },
  presentation: {
    label: 'Entrance / exit',
    description: 'An entrance or exit visitors can start from or be routed to.',
    icon: {
      kind: 'component',
      module: () => import('./components/ExitEntranceIcon'),
    },
  },
  parametrics: {
    groups: [
      {
        label: 'Direction',
        fields: [
          {
            key: 'direction',
            label: 'Entrance or exit',
            kind: 'enum',
            options: ['entrance', 'exit'],
            display: 'segmented',
          },
        ],
      },
    ],
  },
}
