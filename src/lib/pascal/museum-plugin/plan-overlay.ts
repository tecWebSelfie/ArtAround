import {
  BaseNode,
  nodeType,
  objectId,
  type FloorplanGeometry,
  type NodeDefinition,
} from '@pascal-app/core'
import { Flag, PersonStanding } from 'lucide-react'
import { z } from 'zod'
import { markerPlanSymbol } from './plan-symbols'

/**
 * What the visitor's 2D floor plan (`MuseumFloorplan`) draws on top of the
 * museum, as Pascal floor-plan geometry:
 *
 * - `museum:plan-work`, a node kind that exists only in the scene handed to
 *   `FloorplanPreview` (never in the 3D scene or a saved map, no 3D
 *   renderer): a work as a round picture, its photo in a circle;
 * - `visitorPlanGeometry` and `routePlanGeometry`: the avatar and the route
 *   ahead with a flag at its end. They change as the visitor walks, so they
 *   are drawn by `MuseumFloorplan`'s own layer over the plan, not as scene
 *   nodes: every new scene makes `FloorplanPreview` refit its view, which
 *   would undo the visitor's pan and zoom at each step.
 *
 * Positions are plan coordinates in metres: x and z of the ground level.
 */
const point = z.tuple([z.number(), z.number(), z.number()])
const planOnly = {
  schemaVersion: 1,
  // `furnish` keeps them out of the plan's automatic fit (as Pascal's own
  // items): the view frames the building.
  category: 'furnish',
  capabilities: { selectable: false, deletable: false, duplicable: false },
} as const

/** The node fields every plan-only node shares (`MuseumFloorplan` adds them too). */
export const PLAN_NODE_BASE = {
  object: 'node',
  parentId: null,
  visible: true,
  metadata: {},
} as const

export const PLAN_WORK_NODE_TYPE = 'museum:plan-work'
export const PlanWorkNode = BaseNode.extend({
  id: objectId('planWork'),
  type: nodeType(PLAN_WORK_NODE_TYPE),
  position: point,
  /** A round SVG with the work's photo (see `roundPictureUrl`). */
  url: z.string(),
})
/** Big enough to tell works apart at museum scale, small enough not to cover a room. */
const WORK_DIAMETER = 1.3
export const PlanWorkDefinition: NodeDefinition<typeof PlanWorkNode> = {
  ...planOnly,
  kind: PLAN_WORK_NODE_TYPE,
  schema: PlanWorkNode,
  floorplan: (node) => ({
    kind: 'image',
    url: node.url,
    center: [node.position[0], node.position[2]],
    width: WORK_DIAMETER,
    height: WORK_DIAMETER,
  }),
  defaults: () => ({
    ...PLAN_NODE_BASE,
    position: [0, 0, 0],
    url: '',
  }),
}

/** Where the visitor is: the avatar's icon on a disc of the primary color. */
export function visitorPlanGeometry(position: readonly number[], color: string) {
  return markerPlanSymbol({ Icon: PersonStanding, hex: color }, position[0]!, position[2]!, 0.75)
}

/** The route ahead as a line, with a flag at its end. */
export function routePlanGeometry(
  points: readonly (readonly number[])[],
  color: string,
): FloorplanGeometry | null {
  const end = points.at(-1)
  if (!end) return null
  return {
    kind: 'group',
    children: [
      {
        kind: 'polyline',
        points: points.map(([x, , z]) => [x!, z!] as const),
        fill: 'none',
        stroke: color,
        strokeWidth: 5,
        vectorEffect: 'non-scaling-stroke',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      markerPlanSymbol({ Icon: Flag, hex: color }, end[0]!, end[2]!, 0.5),
    ],
  }
}
