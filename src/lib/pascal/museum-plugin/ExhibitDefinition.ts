import { NodeDefinition } from '@pascal-app/core'
import {
  EXHIBIT_EDITOR_HEIGHT,
  EXHIBIT_EDITOR_WIDTH,
  EXHIBIT_NODE_TYPE,
  ExhibitNode,
  MUSEUM_OBJECTS_IDS_FIELD,
} from './ExhibitNode'
import { ExhibitObjectsPanel } from './components/ExhibitObjectsPanel'

export const ExhibitDefinition: NodeDefinition<typeof ExhibitNode> = {
  kind: EXHIBIT_NODE_TYPE,
  schema: ExhibitNode,
  floorplan: (node, _) => ({
    kind: 'image',
    url: 'icons/pascal/exhibit-icon.svg',
    center: [node.position[0], node.position[1]],
    width: EXHIBIT_EDITOR_WIDTH,
    height: EXHIBIT_EDITOR_HEIGHT,
  }),
  renderer: {
    kind: 'parametric',
    module: () => import('./components/ExhibitRenderer'),
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
    floorPlaced: {
      footprint: () => ({
        dimensions: [0.3, 0.02, 0.3],
        rotation: [0, 0, 0],
      }),
      collides: true,
    },
  },
  category: 'analysis',
  schemaVersion: 1,
  mcp: {
    description:
      'A node representing an active exhibit in the museum for visitors, which can contain multiple museum objects.',
  },
  presentation: {
    description:
      'A node representing an exhibit in the museum, which can contain multiple museum objects.',
    label: 'Exhibit',
    icon: {
      kind: 'component',
      module: () => import('./components/ExhibitIcon'),
    },
  },
  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    [MUSEUM_OBJECTS_IDS_FIELD]: [],
  }),
  parametrics: {
    groups: [
      {
        label: 'Museum objects',
        fields: [
          // TODO: Add your editor as a custom field:
          // { key: 'museumObjectsIds', kind: 'custom', component: YourEditor },
          {
            key: MUSEUM_OBJECTS_IDS_FIELD,
            kind: 'custom',
            component: ExhibitObjectsPanel,
          },
        ],
      },
    ],
  },
}
