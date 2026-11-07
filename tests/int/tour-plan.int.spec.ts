import { describe, expect, it } from 'vitest'
import {
  fitTimeBudget,
  PlanRequest,
  planPrompt,
  planRequestKey,
  type PlanCandidate,
} from '@/lib/tour-plan'

/**
 * Tours built from the visitor's constraints (course brief, Navigator 18-33):
 *
 * - "I only have half an hour, show me the important things only";
 * - "we have already seen this museum twice, surprise us with curiosities";
 * - "two adults and two children aged 5 and 8: synchronized contents, with
 *   language and details fit for their age";
 * - "I am writing a thesis on Parmigianino and know he had ties with Bedoli".
 *
 * The seam is `src/lib/tour-plan.ts`, the rules `/api/plan-tour` applies
 * around the model: the form's answers it accepts, what it tells the model,
 * and the time budget our own code enforces on the model's choice. The model
 * itself only picks content IDs; its answers are not under test here.
 */
const request = (overrides: Partial<PlanRequest> = {}): PlanRequest => ({
  museumId: 'pinacoteca',
  minutes: 30,
  returning: false,
  adults: 1,
  childrenAges: [],
  interests: '',
  lng: 'it',
  ...overrides,
})

const candidate = (id: string, minutes: number, extra: Partial<PlanCandidate> = {}) => ({
  id,
  title: `Content ${id}`,
  objectName: `Work ${id}`,
  room: 'Sala 15',
  difficulty: 'medium',
  audience: 'everyone',
  minutes,
  ...extra,
})

describe('a visit within the visitor’s time', () => {
  it('keeps the most important stops that fit half an hour, walking included', () => {
    // Model's order, most important first: 8+2, 10+2, 15+2 (skipped), 4+2 → 28 min.
    const stops = [candidate('a', 8), candidate('b', 10), candidate('c', 15), candidate('d', 4)]

    expect(fitTimeBudget(stops, 30).map(({ id }) => id)).toEqual(['a', 'b', 'd'])
  })

  it('skips an overlong first choice and offers a shorter work within the budget', () => {
    expect(
      fitTimeBudget([candidate('long', 45), candidate('x', 1)], 30).map(({ id }) => id),
    ).toEqual(['x'])
    expect(fitTimeBudget([candidate('long', 45)], 30)).toEqual([])
  })

  it('accepts the form’s constraints and refuses impossible ones', () => {
    expect(PlanRequest.safeParse(request({ childrenAges: [5, 8], adults: 2 })).success).toBe(true)
    expect(PlanRequest.safeParse(request({ minutes: 5 })).success).toBe(false)
    expect(PlanRequest.safeParse(request({ childrenAges: [25] })).success).toBe(false)
    expect(PlanRequest.safeParse(request({ adults: 0, childrenAges: [] })).success).toBe(false)
  })
})

describe('what the planner is asked', () => {
  const candidates = [
    candidate('c1', 2, { audience: 'children', difficulty: 'easy' }),
    candidate('c2', 3),
  ]

  it('asks for the important works on a first visit, curiosities on a returning one', () => {
    expect(planPrompt(request(), 'Italian', candidates).system).toMatch(/most important works/)
    expect(planPrompt(request({ returning: true }), 'Italian', candidates).system).toMatch(
      /curiosities/,
    )
  })

  it('describes a family group and asks for contents fit for the children', () => {
    const { system, prompt } = planPrompt(
      request({ adults: 2, childrenAges: [5, 8] }),
      'Italian',
      candidates,
    )

    expect(prompt).toContain('Group: 2 adult(s) and children aged 5, 8.')
    expect(system).toMatch(/contents for children or easy ones/)
  })

  it('passes a thesis topic as the visitor’s interests', () => {
    const interests = 'Tesi di laurea sul Parmigianino e i suoi rapporti con Bedoli'

    expect(planPrompt(request({ interests }), 'Italian', candidates).prompt).toContain(
      `Interests: ${interests}`,
    )
  })

  it('lists every candidate with its level, audience and length, and the time limit', () => {
    const { system, prompt } = planPrompt(request(), 'Italian', candidates)

    expect(prompt).toContain('c1 | Content c1 | Work c1 | Sala 15 | easy | children | 2')
    expect(system).toContain('must fit in 30 minutes')
    expect(system).toContain('in Italian')
  })

  it('reuses a plan for the same answers, whatever the children’s order or spacing', () => {
    const a = planRequestKey('m1', request({ childrenAges: [8, 5], interests: 'Bedoli  ' }))
    const b = planRequestKey('m1', request({ childrenAges: [5, 8], interests: 'bedoli' }))

    expect(a).toBe(b)
    expect(planRequestKey('m1', request({ minutes: 60 }))).not.toBe(b)
  })
})
