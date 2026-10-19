import { z } from 'zod'

/**
 * Pure rules of the "Plan my visit" form, shared by the form page and
 * `/api/plan-tour`:
 *
 * - `PlanRequest`: the form's answers, the same constraints as the course
 *   brief's examples (half an hour, a returning visitor, two adults with
 *   children aged 5 and 8, a thesis topic);
 * - `planRequestKey`: one string per distinct request, so identical answers
 *   for the same museum reuse an already planned tour;
 * - `fitTimeBudget`: keeps the model's choices (most important first) while
 *   they fit the visitor's time;
 * - `planPrompt`: the instructions for the model, which only picks content IDs.
 */

export const VISIT_MINUTES = [30, 60, 90, 120] as const

export const PlanRequest = z.object({
  /** Empty: the model picks the museum from the interests (or asks). */
  museumId: z.string().max(64).nullable(),
  minutes: z.number().int().min(15).max(240),
  returning: z.boolean(),
  adults: z.number().int().min(0).max(30),
  childrenAges: z.array(z.number().int().min(0).max(17)).max(20),
  interests: z.string().max(500),
  lng: z.string().min(2).max(10),
})
export type PlanRequest = z.infer<typeof PlanRequest>

/** Walking between two stops, added to each content's reading time. */
export const WALK_MINUTES_PER_STOP = 2

export function planRequestKey(museumId: string, request: PlanRequest) {
  return JSON.stringify({
    museumId,
    minutes: request.minutes,
    returning: request.returning,
    adults: request.adults,
    childrenAges: [...request.childrenAges].sort((a, b) => a - b),
    interests: request.interests.trim().toLowerCase().replace(/\s+/g, ' '),
    lng: request.lng,
  })
}

/** What `/api/plan-tour` returns for the preview. */
export type PlannedTour = {
  id: string
  title: string
  description: string
  totalMinutes: number
  stops: { id: string; title: string; objectName: string; room: string | null; minutes: number }[]
}

export type PlanCandidate = {
  id: string
  title: string
  objectName: string
  room: string | null
  difficulty: string
  audience: string
  minutes: number
}

/** Keeps stops in the given order while reading + walking fits the time (at least one). */
export function fitTimeBudget<T extends { minutes: number }>(stops: T[], minutes: number) {
  const kept: T[] = []
  let used = 0
  for (const stop of stops) {
    const cost = stop.minutes + WALK_MINUTES_PER_STOP
    if (kept.length && used + cost > minutes) continue
    kept.push(stop)
    used += cost
  }
  return kept
}

export function planPrompt(request: PlanRequest, language: string, candidates: PlanCandidate[]) {
  const group = [
    request.adults ? `${request.adults} adult(s)` : '',
    request.childrenAges.length ? `children aged ${request.childrenAges.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' and ')
  return {
    system: [
      'You plan a visit inside one museum for a visitor, choosing from its contents.',
      'Return the IDs of the contents to visit, the most important for this visitor first.',
      `Each stop takes its reading minutes plus ${WALK_MINUTES_PER_STOP} minutes of walking;`,
      `the total must fit in ${request.minutes} minutes.`,
      request.returning
        ? 'They have visited before: prefer curiosities and less obvious works to the most famous ones.'
        : 'It is their first visit: prefer the most important works.',
      request.childrenAges.length
        ? 'Children are in the group: prefer contents for children or easy ones, and keep it varied.'
        : '',
      'Follow their interests when they give any. Use only IDs from the list.',
      `Write the title (at most 60 characters) and description (at most 70) in ${language}.`,
      'They describe the visit itself; do not mention planning or the visitor.',
    ]
      .filter(Boolean)
      .join('\n'),
    prompt: [
      group ? `Group: ${group}.` : '',
      request.interests.trim()
        ? `Interests: ${request.interests.trim()}`
        : 'Interests: none given.',
      'Contents (id | title | object | room | difficulty | audience | reading minutes):',
      ...candidates.map((c) =>
        [c.id, c.title, c.objectName, c.room ?? '-', c.difficulty, c.audience, c.minutes].join(
          ' | ',
        ),
      ),
    ]
      .filter(Boolean)
      .join('\n'),
  }
}
