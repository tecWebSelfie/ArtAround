import { NodeDefinition } from '@pascal-app/core'
import { itemDefinition } from '@pascal-app/nodes'
import { z } from 'zod'
import { EXHIBIT_NODE_TYPE, ExhibitNode, MUSEUM_OBJECTS_IDS_FIELD } from './ExhibitNode'
import { ExhibitObjectsPanel } from './components/ExhibitObjectsPanel'

export type PascalExhibit = z.infer<typeof ExhibitNode>

export const ExhibitDefinition: NodeDefinition<typeof ExhibitNode> = {
  ...itemDefinition,
  kind: EXHIBIT_NODE_TYPE,
  schema: ExhibitNode,
  capabilities: { ...itemDefinition['capabilities'], duplicable: false },
  category: itemDefinition['category'],
  schemaVersion: 1,
  presentation: {
    label: 'Exhibit',
    icon: {
      kind: 'component',
      module: () => import('./components/ExhibitIcon'),
    },
  },
  defaults: () => ({
    ...itemDefinition['defaults'](),
    [MUSEUM_OBJECTS_IDS_FIELD]: [],
  }),
  parametrics: {
    ...itemDefinition.parametrics,
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
