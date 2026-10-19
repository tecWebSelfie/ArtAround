import { pointInPolygon2D, type PolygonPoint2D } from '@pascal-app/core'
import { museumObjectId } from './tour-navigation'

/**
 * Rooms, doors and object positions read straight from a saved Pascal map
 * (`museum.map` JSON). Route directions name the rooms and doors a path goes
 * through; nearby suggestions look up which room the visitor is in.
 *
 * Coordinates are the plan's [x, z] metres. Museums are one level whose
 * building sits at the origin, so level-local plan coordinates equal world
 * coordinates (the same assumption the navmesh is baked with).
 */
export type Room = { id: string; name: string; polygon: PolygonPoint2D[] }
export type Door = { id: string; name: string; point: PolygonPoint2D }
export type PlacedObject = { objectId: string; point: PolygonPoint2D }
export type MuseumRooms = { rooms: Room[]; doors: Door[]; objects: PlacedObject[] }

type RawNode = {
  id?: unknown
  type?: unknown
  name?: unknown
  polygon?: unknown
  start?: unknown
  end?: unknown
  wallId?: unknown
  position?: unknown
}

const isPoint = (value: unknown): value is PolygonPoint2D =>
  Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number'

export function museumRooms(nodes: Record<string, unknown> | null | undefined): MuseumRooms {
  const all = Object.values(nodes ?? {}) as RawNode[]
  const rooms: Room[] = []
  const doors: Door[] = []
  const objects: PlacedObject[] = []
  // Zones are Pascal's rooms: a named polygon on the floor plan.
  for (const node of all) {
    if (
      node.type === 'zone' &&
      typeof node.id === 'string' &&
      Array.isArray(node.polygon) &&
      node.polygon.every(isPoint)
    ) {
      rooms.push({ id: node.id, name: String(node.name ?? ''), polygon: node.polygon })
    }
  }
  // A door stores its distance along its host wall (`position[0]`), so its
  // plan point is the wall start moved that far towards the wall end.
  const walls = new Map(
    all.flatMap((node) =>
      node.type === 'wall' && isPoint(node.start) && isPoint(node.end)
        ? [[node.id, { start: node.start, end: node.end }] as const]
        : [],
    ),
  )
  for (const node of all) {
    if (node.type !== 'door' || typeof node.id !== 'string' || !node.name) continue
    const wall = walls.get(node.wallId)
    const along = Array.isArray(node.position) ? Number(node.position[0]) : NaN
    if (!wall || !Number.isFinite(along)) continue
    const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) || 1
    doors.push({
      id: node.id,
      name: String(node.name),
      point: [
        wall.start[0] + ((wall.end[0] - wall.start[0]) * along) / length,
        wall.start[1] + ((wall.end[1] - wall.start[1]) * along) / length,
      ],
    })
  }
  // Museum objects are catalog items: their asset id is the Payload object id.
  for (const node of all) {
    const objectId = museumObjectId(node)
    const position = node.position
    if (objectId && Array.isArray(position)) {
      objects.push({ objectId, point: [Number(position[0]), Number(position[2])] })
    }
  }
  return { rooms, doors, objects }
}

/** The room containing a plan point, if any (corridors without a zone have none). */
export function roomAt(rooms: Room[], point: PolygonPoint2D): Room | null {
  return rooms.find((room) => pointInPolygon2D(point, room.polygon)) ?? null
}
