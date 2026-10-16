import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

export const EXHIBIT_NODE_TYPE = 'museum:exhibit'

export const MUSEUM_OBJECTS_IDS_FIELD = 'museumObjectsIds' as const

export const EXHIBIT_EDITOR_WIDTH = 1

export const EXHIBIT_EDITOR_HEIGHT = 0.12

export const ExhibitNode = BaseNode.extend({
  id: objectId('exhibit'),
  type: nodeType(EXHIBIT_NODE_TYPE),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  [MUSEUM_OBJECTS_IDS_FIELD]: z.array(z.string().nonempty()),
})
