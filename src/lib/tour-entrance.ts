import type { PlacedObject } from '@/lib/museum-rooms'
import { ExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { placedEntrances, type ExitEntranceMarker } from '@/lib/pascal/museum-plugin/markers-in-map'
import { nearestEntrance } from '@/lib/route-start'

/**
 * The entrance a tour starts from (docs/tour-navigation.md → Tour entrance),
 * as an entrance marker's node id, or null when the map has no placed
 * entrance.
 *
 * An author may choose it (`tours.startEntrance`). Unchosen, or chosen but no
 * longer a placed entrance of the map (staff moved or removed the marker), it
 * is the placed entrance nearest the tour's first stop (with no first stop on
 * the map, the first entrance), which is what a tour without the field always
 * did. "Nearest" is `nearestEntrance`, `routeStart`'s own rule, over plan distances between the
 * markers' and works' stored positions, as the visit planner measures them
 * (`src/app/api/plan-tour/route.ts`).
 *
 * Pure, over what the caller already read from the map (its markers and its
 * placed works, `useMuseumMapData` on the navigation page), so it never parses
 * the map again.
 */
export function tourStartEntrance(
  {
    startEntrance,
    firstObjectId,
  }: {
    /** The author's choice, if any. */
    startEntrance?: string | null
    /** The work of the tour's first visitable stop, if any. */
    firstObjectId?: string | null
  },
  map: { exitEntrances: readonly ExitEntranceMarker[]; objects: readonly PlacedObject[] },
): string | null {
  const entrances = placedEntrances(map.exitEntrances).map((entrance) => ({
    id: entrance.id,
    point: [entrance.position[0], entrance.position[2]] as [number, number],
  }))
  if (startEntrance && entrances.some((entrance) => entrance.id === startEntrance)) {
    return startEntrance
  }
  const first = map.objects.find((object) => object.objectId === firstObjectId)?.point
  const nearest = first
    ? nearestEntrance(entrances, first, (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]))
    : null
  return nearest?.id ?? entrances[0]?.id ?? null
}

/**
 * Whether `id` names a placed entrance of the map's nodes: what
 * `startEntrance` may hold. Nodes are keyed by id, so only that one node is
 * parsed, not the whole map.
 */
export function isPlacedEntrance(id: string, nodes: Record<string, unknown> | null) {
  const node = ExitEntranceNode.safeParse(nodes?.[id])
  return node.success && placedEntrances([node.data]).length === 1
}
