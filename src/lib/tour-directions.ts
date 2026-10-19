import type { PolygonPoint2D } from '@pascal-app/core'
import { roomAt, type MuseumRooms } from './museum-rooms'

/**
 * Turns a navmesh route into human directions, without AI:
 *
 *   path points → rooms entered → doors crossed → turns → arrival side
 *
 * The route is sampled every `SAMPLE_METRES`, each sample is looked up in the
 * map's rooms, and every change of room starts a new step. The result is plain
 * data; the UI turns it into localized sentences, the voice guidance speaks
 * the same sentences, and GPS progress picks the step by distance walked.
 */
export type Turn = 'left' | 'right' | 'straight'

export type DirectionStep =
  /** First leg. The visitor's heading is unknown here, so no turn is given. */
  | { kind: 'start'; room: string | null; metres: number; from: number }
  /** Entering another room, optionally through a named door. */
  | { kind: 'enter'; room: string; door: string | null; turn: Turn; metres: number; from: number }
  /** The destination's side relative to the last stretch walked. */
  | { kind: 'arrive'; side: Turn; from: number }

const SAMPLE_METRES = 0.5
/** A door counts as crossed when the room change happens this close to it. */
const DOOR_RADIUS = 2
/** Direction changes smaller than this read as "straight on". */
const STRAIGHT_DEGREES = 30
/** Distance from the end at which the arrival step takes over. */
const ARRIVE_METRES = 2

type Vec3 = [number, number, number]

/** Plan position [x, z] of every half metre along the path, plus the end. */
export function samplePath(path: Vec3[]): PolygonPoint2D[] {
  const samples: PolygonPoint2D[] = []
  for (let index = 1; index < path.length; index++) {
    const [ax, , az] = path[index - 1]
    const [bx, , bz] = path[index]
    const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / SAMPLE_METRES))
    for (let step = 0; step < count; step++) {
      const t = step / count
      samples.push([ax + (bx - ax) * t, az + (bz - az) * t])
    }
  }
  const last = path.at(-1)
  if (last) samples.push([last[0], last[2]])
  return samples
}

/**
 * Left or right when going from direction `a` to direction `b`, seen from
 * above. Plan x grows to the right and z grows towards the bottom of the
 * floor plan, so a negative cross product is a turn to the left.
 */
export function turnBetween(a: PolygonPoint2D, b: PolygonPoint2D): Turn {
  const cross = a[0] * b[1] - a[1] * b[0]
  const dot = a[0] * b[0] + a[1] * b[1]
  const degrees = Math.abs((Math.atan2(cross, dot) * 180) / Math.PI)
  if (degrees < STRAIGHT_DEGREES) return 'straight'
  return cross < 0 ? 'left' : 'right'
}

const direction = (from: PolygonPoint2D, to: PolygonPoint2D): PolygonPoint2D => [
  to[0] - from[0],
  to[1] - from[1],
]

export function buildDirections(
  path: Vec3[] | null,
  map: MuseumRooms,
  /** Plan position of the destination itself (the route ends beside it). */
  target?: PolygonPoint2D | null,
): DirectionStep[] {
  if (!path || path.length < 2) return []
  const samples = samplePath(path)

  // 1. Group consecutive samples by room. Samples outside any room (a gap
  // between zones) stay in the current group instead of starting a step.
  const legs: { room: string | null; samples: PolygonPoint2D[]; from: number }[] = []
  samples.forEach((sample, index) => {
    const room = roomAt(map.rooms, sample)?.name ?? null
    const current = legs.at(-1)
    if (!current || (room && room !== current.room && current.room !== null)) {
      legs.push({ room, samples: [sample], from: index * SAMPLE_METRES })
    } else {
      // The first leg can start outside a room and pick its name up later.
      current.room ??= room
      current.samples.push(sample)
    }
  })

  // 2. One step per leg: the first has no turn, the others name the door
  // closest to where the room changed and the turn made to go through it.
  const steps: DirectionStep[] = legs.map((leg, index) => {
    const metres = Math.max(1, Math.round(leg.samples.length * SAMPLE_METRES))
    if (index === 0) return { kind: 'start', room: leg.room, metres, from: leg.from }
    const previous = legs[index - 1]
    const entry = leg.samples[0]
    const door = map.doors
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.point[0] - entry[0], candidate.point[1] - entry[1]),
      }))
      .filter(({ distance }) => distance <= DOOR_RADIUS)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate
    return {
      kind: 'enter',
      room: leg.room ?? '',
      door: door?.name ?? null,
      turn: turnBetween(
        direction(previous.samples[0], previous.samples.at(-1)!),
        direction(entry, leg.samples.at(-1)!),
      ),
      metres,
      from: leg.from,
    }
  })

  // 3. Arrival: which side the destination is on, from the last metre walked.
  const end = samples.at(-1)!
  const beforeEnd = samples[Math.max(0, samples.length - 3)]
  const side =
    target && Math.hypot(target[0] - end[0], target[1] - end[1]) > 0.3
      ? turnBetween(direction(beforeEnd, end), direction(end, target))
      : 'straight'
  // The arrival step takes over once the visitor is ARRIVE_METRES from the end.
  const total = (samples.length - 1) * SAMPLE_METRES
  steps.push({ kind: 'arrive', side, from: Math.max(0, total - ARRIVE_METRES) })
  return steps
}

/** The step a visitor is on after walking `distance` metres along the route. */
export function stepAtDistance(steps: DirectionStep[], distance: number): number {
  let current = 0
  steps.forEach((step, index) => {
    if (step.from <= distance) current = index
  })
  return current
}
