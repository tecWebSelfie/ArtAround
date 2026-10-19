import type { PolygonPoint2D } from '@pascal-app/core'
import { roomAt, type Room } from './museum-rooms'

/**
 * Visiting order for a planned tour, "finish the room you are in, then go to
 * the closest room":
 *
 * 1. each stop belongs to the room (Pascal zone) containing its object;
 * 2. from the start point, pick the closest room not visited yet, measured to
 *    the average point of that room's stops;
 * 3. inside the room, go to the closest stop, then the next closest…;
 * 4. continue from the last stop until no room is left.
 *
 * Straight-line distances are enough to avoid zig-zagging between rooms; the
 * real walking path is still computed by the navigation map at each step.
 * Stops whose object is not on the map keep their order and go last.
 */

export type TourStop = { id: string; point: PolygonPoint2D | null }

const distance = (a: PolygonPoint2D, b: PolygonPoint2D) => Math.hypot(a[0] - b[0], a[1] - b[1])

const centre = (stops: { point: PolygonPoint2D }[]): PolygonPoint2D => [
  stops.reduce((sum, stop) => sum + stop.point[0], 0) / stops.length,
  stops.reduce((sum, stop) => sum + stop.point[1], 0) / stops.length,
]

export function orderStops(stops: TourStop[], rooms: Room[], start: PolygonPoint2D | null) {
  const placed = stops.filter((stop): stop is { id: string; point: PolygonPoint2D } =>
    Boolean(stop.point),
  )
  const unplaced = stops.filter((stop) => !stop.point)

  // A stop outside every zone (e.g. a corridor) is a "room" of its own.
  const groups = new Map<string, { id: string; point: PolygonPoint2D }[]>()
  for (const stop of placed) {
    const key = roomAt(rooms, stop.point)?.id ?? `alone:${stop.id}`
    groups.set(key, [...(groups.get(key) ?? []), stop])
  }

  const order: string[] = []
  let here = start ?? placed[0]?.point ?? null
  while (groups.size) {
    // 2. Closest room.
    let nextRoom = ''
    let best = Infinity
    for (const [key, roomStops] of groups) {
      const d = here ? distance(here, centre(roomStops)) : 0
      if (d < best) [nextRoom, best] = [key, d]
    }
    // 3. Closest stop first inside it.
    const left = [...groups.get(nextRoom)!]
    groups.delete(nextRoom)
    while (left.length) {
      let index = 0
      if (here) {
        const from = here
        left.forEach((stop, i) => {
          if (distance(from, stop.point) < distance(from, left[index].point)) index = i
        })
      }
      const [stop] = left.splice(index, 1)
      order.push(stop.id)
      here = stop.point
    }
  }
  return [...order, ...unplaced.map((stop) => stop.id)]
}
