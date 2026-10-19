import type { NodeDefinition } from '@pascal-app/core'
import { SERVICE_META } from './markers'
import { SERVICE_NODE_TYPE, ServiceNode } from './ServiceNode'
import { ServiceOpeningHoursField } from './components/ServiceOpeningHoursField'

/**
 * Service marker: an `analysis` node, so Pascal never feeds it into the
 * collider world / navmesh. It is movable and selectable, and it shares the
 * museum plugin's marker placement tool with entrances and exits.
 */
export const ServiceDefinition: NodeDefinition<typeof ServiceNode> = {
  kind: SERVICE_NODE_TYPE,
  schema: ServiceNode,
  schemaVersion: 1,
  category: 'analysis',
  floorplan: (node) => ({
    kind: 'circle',
    cx: node.position[0],
    cy: node.position[2],
    r: 0.35,
    fill: SERVICE_META[node.service].hex,
    fillOpacity: 0.85,
    stroke: '#ffffff',
    strokeWidth: 0.04,
  }),
  renderer: {
    kind: 'parametric',
    module: () => import('./components/ServiceRenderer'),
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
    service: 'infoPoint',
    placed: false,
  }),
  mcp: {
    description:
      'A museum service marker (toilets, food, shop, info point) placed on the map for visitors.',
  },
  presentation: {
    label: 'Service',
    description: 'A museum service (toilets, food, shop, info point) visitors can be routed to.',
    icon: {
      kind: 'component',
      module: () => import('./components/ServiceIcon'),
    },
  },
  parametrics: {
    groups: [
      {
        label: 'Opening hours',
        fields: [
          {
            key: 'openingHours',
            kind: 'custom',
            component: ServiceOpeningHoursField,
          },
        ],
      },
    ],
  },
}
