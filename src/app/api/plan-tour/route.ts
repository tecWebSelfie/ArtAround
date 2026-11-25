import { toMinutes } from '@/lib/duration'
import config from '@/payload.config'
import { museumRooms, roomAt } from '@/lib/museum-rooms'
import { lockedMuseumId } from '@/lib/museum-mode'
import {
  collectMuseumMarkers,
  mapNodes,
  placedEntrances,
} from '@/lib/pascal/museum-plugin/markers-in-map'
import { isLocked } from '@/lib/price'
import { allowRequest } from '@/lib/rate-limit'
import { asViewer, getSession } from '@/lib/session'
import { orderStops } from '@/lib/tour-order'
import {
  fitTimeBudget,
  PlanRequest,
  planPrompt,
  planRequestKey,
  WALK_MINUTES_PER_STOP,
  type PlanCandidate,
  type PlannedTour,
} from '@/lib/tour-plan'
import { languageName, normalizeLocale } from '@/lib/localized'
import type { Object as MuseumObject, Tour } from '@/payload-types'
import { TEXT_MODEL, textModel } from '@/lib/ai-models'
import { generateText, Output } from 'ai'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getPayload, type Payload, type TypedLocale } from 'payload'
import { extractID } from 'payload/shared'
import { z } from 'zod'

/**
 * Plans a tour from the "Plan my visit" form:
 *
 *   answers → museum (chosen, or picked by the model from the interests)
 *   → same answers planned before? reuse that tour
 *   → the museum's free contents with room, difficulty, audience, minutes
 *   → the model picks content IDs, most important first
 *   → our code keeps what fits the time, orders by nearest room
 *   → saved as a normal tour marked `generation.generated`
 *   → preview data back to the form, which offers Start or Change
 *
 * The model only chooses among IDs it is given (schema enum); it never
 * creates contents or runs any other action.
 */
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!allowRequest(request, 6)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const parsed = PlanRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const answers = parsed.data
  const locale = normalizeLocale(answers.lng) ?? 'en'
  const language = languageName(locale)
  const payload = await getPayload({ config })
  const viewer = await asViewer()

  try {
    // 1. Which museum: in museum mode always the locked one (the app is that
    // museum's app, whatever the request body says); else the chosen one, or
    // the one named in the interests.
    const museumId =
      // `||`: an empty id in the body falls through to the interests.
      (await lockedMuseumId()) ||
      answers.museumId ||
      (await museumNamedIn(payload, answers.interests, locale))
    if (!museumId) return NextResponse.json({ error: 'museum' }, { status: 422 })

    // 2. Planned before with the same answers? Reuse it.
    const requestKey = createHash('sha256').update(planRequestKey(museumId, answers)).digest('hex')
    // Independent reads: a plan made before for the same answers, and the museum.
    const [previous, museum] = await Promise.all([
      payload.find({
        collection: 'tours',
        where: {
          and: [
            { 'generation.requestKey': { equals: requestKey } },
            { visibility: { not_equals: 'private' } },
          ],
        },
        // Newest first: a stale plan is replaced by a new tour with the same key,
        // and that replacement (not the stale original) is the one to reuse.
        sort: '-createdAt',
        limit: 1,
        depth: 0,
        ...viewer,
      }),
      // A museum id that doesn't exist or is malformed is the client's mistake,
      // not a downstream failure: read it as null and answer 422 below instead
      // of letting the catch turn Payload's NotFound into a 502. Any other
      // error (database outage) still rejects and reaches that 502.
      payload.findByID({ collection: 'museums', id: museumId, depth: 0, locale }).catch((error) => {
        const status = (error as { status?: number }).status
        if (status === 404 || status === 400) return null
        throw error
      }),
    ])
    if (!museum) return NextResponse.json({ error: 'museum' }, { status: 422 })
    const nodes = mapNodes(museum.map)
    const { rooms, objects: placed } = museumRooms(nodes)
    const pointOf = new Map(placed.map((entry) => [entry.objectId, entry.point]))

    // 3. The museum's contents this visitor can read for free, with where they are.
    const objectIds = (museum.objects ?? []).map((entry) =>
      typeof entry === 'string' ? entry : entry.id,
    )
    const { docs: objects } = await payload.find({
      collection: 'objects',
      where: { id: { in: objectIds } },
      locale,
      depth: 1,
      pagination: false,
      populate: {
        contents: {
          title: true,
          difficulty: true,
          audience: true,
          durationSeconds: true,
          price: true,
          visibility: true,
          body: true,
        },
      },
      select: { name: true, contents: true },
      ...viewer,
    })
    const candidates = freeCandidates(objects, (objectId) => {
      const point = pointOf.get(objectId)
      return point ? (roomAt(rooms, point)?.name ?? null) : null
    })
    if (!candidates.length) return NextResponse.json({ error: 'empty' }, { status: 422 })
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const preview = (tour: PreviewTour) => plannedTour(tour, byId, museumId)
    const cached = previous.docs[0] && preview(previous.docs[0])
    // Content can be removed, made private or lengthened after planning.
    const reusable =
      cached &&
      cached.stops.length === previous.docs[0].contents.length &&
      cached.stops.length > 0 &&
      cached.totalMinutes <= answers.minutes
    if (reusable) return NextResponse.json(cached)

    // 4. The model picks, most important first.
    const { output } = await generateText({
      model: await textModel(),
      output: Output.object({
        schema: z.object({
          title: z.string(),
          description: z.string(),
          contentIds: z.array(z.enum(candidates.map((candidate) => candidate.id))),
        }),
      }),
      ...planPrompt(answers, language, candidates),
    })

    // 5. Our rules: no repeats, within the time, then nearest-room order.
    const picked = onePerWork(output.contentIds, byId)
    // Recover from a model choosing only overlong entries without exceeding time.
    const preferred = fitTimeBudget(picked, answers.minutes)
    const fitted = preferred.length
      ? preferred
      : fitTimeBudget(candidates, answers.minutes).slice(0, 1)
    if (!fitted.length) return NextResponse.json({ error: 'budget' }, { status: 422 })
    const [entrance] = placedEntrances(collectMuseumMarkers(nodes).exitEntrances)
    const order = orderStops(
      fitted.map((stop) => ({ id: stop.id, point: pointOf.get(stop.objectId) ?? null })),
      rooms,
      entrance ? [entrance.position[0], entrance.position[2]] : null,
    )

    // 6. Saved as an ordinary tour, marked as generated in its metadata only.
    const { user } = await getSession()
    const tour = await payload.create({
      collection: 'tours',
      data: {
        title: output.title.slice(0, 60) || museum.name,
        description: output.description.slice(0, 70),
        contents: order,
        museum: museumId,
        ...(user ? { author: user.id } : {}),
        generation: { generated: true, model: TEXT_MODEL, requestKey, request: answers },
      },
    })
    return NextResponse.json(preview(tour))
  } catch (error) {
    console.error('Tour planning failed', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
}

type Candidate = PlanCandidate & { objectId: string }
type PreviewTour = Pick<Tour, 'id' | 'title' | 'description' | 'contents'>

/**
 * Without a museum chosen or locked, the one the visitor's interests name or
 * describe, picked by the model from the list (null when none matches).
 */
async function museumNamedIn(payload: Payload, interests: string, locale: TypedLocale) {
  const { docs } = await payload.find({
    collection: 'museums',
    limit: 200,
    depth: 0,
    locale,
    select: { name: true, location: true },
  })
  if (!docs.length || !interests.trim()) return null
  const { output } = await generateText({
    model: await textModel(),
    output: Output.object({
      schema: z.object({ museumId: z.enum(['none', ...docs.map((museum) => museum.id)]) }),
    }),
    system:
      'Pick the museum the visitor means from the list, or "none" when their words name or clearly describe none of them.',
    prompt: [
      `Visitor: ${interests}`,
      // `id: name` lines: the AI_MOCK model matches the visitor's words against them.
      ...docs.map((museum) => `${museum.id}: ${museum.name}, ${museum.location?.city ?? ''}`),
    ].join('\n'),
  })
  return output.museumId === 'none' ? null : output.museumId
}

/** The listed contents of the works this visitor can read for free, with their room. */
function freeCandidates(
  objects: Pick<MuseumObject, 'id' | 'name' | 'contents'>[],
  roomOf: (objectId: string) => string | null,
): Candidate[] {
  return objects.flatMap((object) => {
    const room = roomOf(object.id)
    return (object.contents ?? []).flatMap((content) =>
      typeof content === 'object' && content.visibility !== 'private' && !isLocked(content)
        ? [
            {
              id: content.id,
              title: content.title,
              objectName: object.name,
              objectId: object.id,
              room,
              difficulty: content.difficulty,
              audience: content.audience ?? 'everyone',
              minutes: toMinutes(content.durationSeconds) || 1,
            },
          ]
        : [],
    )
  })
}

/** The model's picks, without repeats and one per work: adult/child texts are reading choices, not two stops. */
function onePerWork(contentIds: string[], byId: Map<string, Candidate>) {
  const works = new Set<string>()
  return [...new Set(contentIds)].flatMap((id) => {
    const candidate = byId.get(id)
    if (!candidate || works.has(candidate.objectId)) return []
    works.add(candidate.objectId)
    return [candidate]
  })
}

/** A tour as the planner shows it: its stops that are still candidates, and the time. */
function plannedTour(
  tour: PreviewTour,
  byId: Map<string, Candidate>,
  museumId: string,
): PlannedTour {
  const stops = tour.contents.flatMap((entry) => {
    const candidate = byId.get(extractID(entry))
    return candidate
      ? [
          {
            id: candidate.id,
            title: candidate.title,
            objectName: candidate.objectName,
            room: candidate.room,
            minutes: candidate.minutes,
          },
        ]
      : []
  })
  return {
    id: tour.id,
    // Starting it opens the tour inside this museum's navigation.
    museumId,
    title: tour.title,
    description: tour.description ?? '',
    totalMinutes: stops.reduce((sum, stop) => sum + stop.minutes + WALK_MINUTES_PER_STOP, 0),
    stops,
  }
}
