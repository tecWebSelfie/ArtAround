import { BaseNode, nodeType, objectId } from '@pascal-app/core'
import { z } from 'zod'

/**
 * Entrances and exits of the museum. They are not necessarily doors: staff
 * explicitly drop a marker where visitors enter or leave. Tour navigation uses
 * the nearest entrance as the default start and the nearest exit as a route
 * destination, and both are searchable from the spotlight.
 */
export const EXIT_ENTRANCE_NODE_TYPE = 'museum:exit-entrance'

export const EXIT_ENTRANCE_DIRECTIONS = ['entrance', 'exit'] as const
export type ExitEntranceDirection = (typeof EXIT_ENTRANCE_DIRECTIONS)[number]

export const ExitEntranceNode = BaseNode.extend({
  id: objectId('exitEntrance'),
  type: nodeType(EXIT_ENTRANCE_NODE_TYPE),
  position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  direction: z.enum(EXIT_ENTRANCE_DIRECTIONS),
  /** Same placement flag as services, so both kinds share one marker tool. */
  placed: z.boolean().default(false),
})
