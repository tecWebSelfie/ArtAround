import config from '@/payload.config'
import { museumRooms, roomAt } from '@/lib/museum-rooms'
import { lockedMuseumId } from '@/lib/museum-mode'
import { collectMuseumMarkers, mapNodes } from '@/lib/pascal/museum-plugin/markers-in-map'
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
import { normalizeLocale } from '@/lib/localized'
import type { Tour } from '@/payload-types'
import { createGroq } from '@ai-sdk/groq'
import { generateText, Output } from 'ai'
import IsoCodes from 'iso-639-1'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getPayload } from 'payload'
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

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = 'openai/gpt-oss-120b'

export async function POST(request: Request) {
  if (!allowRequest(request, 6)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const parsed = PlanRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const answers = parsed.data
  const locale = normalizeLocale(answers.lng) ?? 'en'
  const language = IsoCodes.getName(locale) || 'English'
  const payload = await getPayload({ config })
  const viewer = await asViewer()

  try {
    // 1. Which museum: in museum mode always the locked one (the app is that
    // museum's app, whatever the request body says); else the chosen one, or
    // the one named in the interests.
    let museumId = (await lockedMuseumId()) ?? answers.museumId
    if (!museumId) {
      const { docs } = await payload.find({
        collection: 'museums',
        limit: 200,
        depth: 0,
        locale,
        select: { name: true, location: true },
      })
      if (!docs.length || !answers.interests.trim()) {
        return NextResponse.json({ error: 'museum' }, { status: 422 })
      }
      const { output } = await generateText({
        model: groq(MODEL),
        output: Output.object({
          schema: z.object({ museumId: z.enum(['none', ...docs.map((museum) => museum.id)]) }),
        }),
        system:
          'Pick the museum the visitor means from the list, or "none" when their words name or clearly describe none of them.',
        prompt: [
          `Visitor: ${answers.interests}`,
          ...docs.map((museum) => `${museum.id}: ${museum.name}, ${museum.location?.city ?? ''}`),
        ].join('\n'),
      })
      if (output.museumId === 'none') return NextResponse.json({ error: 'museum' }, { status: 422 })
      museumId = output.museumId
    }

    // 2. Planned before with the same answers? Reuse it.
    const requestKey = createHash('sha256').update(planRequestKey(museumId, answers)).digest('hex')
    const previous = await payload.find({
      collection: 'tours',
      where: { 'generation.requestKey': { equals: requestKey } },
      limit: 1,
      depth: 0,
    })
    const museum = await payload.findByID({ collection: 'museums', id: museumId, depth: 0, locale })
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
          readingTimeMins: true,
          price: true,
          body: true,
        },
      },
      select: { name: true, contents: true },
      ...viewer,
    })
    const candidates: (PlanCandidate & { objectId: string })[] = objects.flatMap((object) => {
      const point = pointOf.get(object.id)
      const room = point ? (roomAt(rooms, point)?.name ?? null) : null
      return (object.contents ?? []).flatMap((content) =>
        typeof content === 'object' && !isLocked(content)
          ? [
              {
                id: content.id,
                title: content.title,
                objectName: object.name,
                objectId: object.id,
                room,
                difficulty: content.difficulty,
                audience: content.audience ?? 'everyone',
                minutes: Math.max(1, Math.round(content.readingTimeMins ?? 1)),
              },
            ]
          : [],
      )
    })
    if (!candidates.length) return NextResponse.json({ error: 'empty' }, { status: 422 })
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const preview = (
      tour: Pick<Tour, 'id' | 'title' | 'description' | 'contents'>,
    ): PlannedTour => {
      const stops = tour.contents.flatMap((entry) => {
        const candidate = byId.get(typeof entry === 'string' ? entry : entry.id)
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
    if (previous.docs[0]) return NextResponse.json(preview(previous.docs[0]))

    // 4. The model picks, most important first.
    const { output } = await generateText({
      model: groq(MODEL),
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
    const picked = [...new Set(output.contentIds)].flatMap((id) => {
      const candidate = byId.get(id)
      return candidate ? [candidate] : []
    })
    const fitted = fitTimeBudget(picked.length ? picked : candidates.slice(0, 1), answers.minutes)
    const entrance = collectMuseumMarkers(nodes).exitEntrances.find(
      (marker) => marker.placed && marker.direction === 'entrance',
    )
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
        generation: { generated: true, model: MODEL, requestKey, request: answers },
      },
    })
    return NextResponse.json(preview(tour))
  } catch (error) {
    console.error('Tour planning failed', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
}
