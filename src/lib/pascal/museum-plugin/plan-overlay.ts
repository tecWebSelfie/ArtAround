import { BaseNode, nodeType, objectId, type NodeDefinition } from '@pascal-app/core'
import { DEFAULT_PRIMARY } from '@/theme'
import { Flag, PersonStanding } from 'lucide-react'
import { z } from 'zod'
import { markerPlanSymbol } from './plan-symbols'

/**
 * Node kinds that exist only on the visitor's 2D floor plan: they are added
 * to the scene handed to Pascal's `FloorplanPreview` (`MuseumFloorplan`),
 * never to the 3D scene or to a saved map, and have no 3D renderer. Each one
 * draws itself through `floorplan()`, the way every Pascal kind does:
 *
 * - `museum:plan-work`: a work as a round picture (its photo in a circle);
 * - `museum:plan-visitor`: where the visitor is, the avatar's icon;
 * - `museum:plan-route`: the route line, with a flag at its end.
 *
 * Positions are plan coordinates in metres: x and z of the ground level.
 */
const point = z.tuple([z.number(), z.number(), z.number()])
const planOnly = {
  schemaVersion: 1,
  // `furnish` keeps them out of the plan's automatic fit (as Pascal's own
  // items): the view frames the building, and does not move as the visitor
  // walks or the route changes.
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
/** The default primary's filled shade, the color of the route and the visitor. */
const PRIMARY = DEFAULT_PRIMARY[6]

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

export const PLAN_VISITOR_NODE_TYPE = 'museum:plan-visitor'
export const PlanVisitorNode = BaseNode.extend({
  id: objectId('planVisitor'),
  type: nodeType(PLAN_VISITOR_NODE_TYPE),
  position: point,
  /** The museum's primary color, as the avatar's name tag on the 3D map. */
  color: z.string(),
})
export const PlanVisitorDefinition: NodeDefinition<typeof PlanVisitorNode> = {
  ...planOnly,
  kind: PLAN_VISITOR_NODE_TYPE,
  schema: PlanVisitorNode,
  floorplan: (node) =>
    markerPlanSymbol(
      { Icon: PersonStanding, hex: node.color },
      node.position[0],
      node.position[2],
      0.75,
    ),
  defaults: () => ({
    ...PLAN_NODE_BASE,
    position: [0, 0, 0],
    color: PRIMARY,
  }),
}

export const PLAN_ROUTE_NODE_TYPE = 'museum:plan-route'
export const PlanRouteNode = BaseNode.extend({
  id: objectId('planRoute'),
  type: nodeType(PLAN_ROUTE_NODE_TYPE),
  points: z.array(point),
  color: z.string(),
})
export const PlanRouteDefinition: NodeDefinition<typeof PlanRouteNode> = {
  ...planOnly,
  kind: PLAN_ROUTE_NODE_TYPE,
  schema: PlanRouteNode,
  floorplan: (node) => {
    const end = node.points.at(-1)
    if (!end) return null
    return {
      kind: 'group',
      children: [
        {
          kind: 'polyline',
          points: node.points.map(([x, , z]) => [x, z] as const),
          fill: 'none',
          stroke: node.color,
          strokeWidth: 5,
          vectorEffect: 'non-scaling-stroke',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        markerPlanSymbol({ Icon: Flag, hex: node.color }, end[0], end[2], 0.5),
      ],
    }
  },
  defaults: () => ({
    ...PLAN_NODE_BASE,
    points: [],
    color: PRIMARY,
  }),
}
