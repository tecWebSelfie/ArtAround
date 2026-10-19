import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Field, PayloadRequest, RelationshipField, TabsField, Where } from 'payload'

// Default relationship validation needs a live database; the ownership rules
// layered on top of it are what these tests cover.
vi.mock('payload/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload/shared')>()),
  relationship: vi.fn(async () => true),
}))

const {
  deleteUnownedTourQuestions,
  detachDeletedContentFromQuestions,
  detachDeletedQuestionFromTours,
  quizQuestionFilterOptions,
  validateQuizQuestions,
} = await import('@/lib/quiz-ownership')
const { Tour } = await import('@/collections/Tours')
const { QuizAttempts } = await import('@/collections/QuizAttempts')

type Doc = Record<string, unknown> & { id: string }
/** The subset of `Where` operators the quiz ownership helpers use. */
type Clause = { and?: Clause[] } & Record<string, { in?: unknown[]; not_equals?: unknown }>

/** In-memory Local API double: answers `find` by collection, records writes. */
function fakeRequest(data: { quizQuestions?: Doc[]; tours?: Doc[] }) {
  const matches = (doc: Doc, where: Clause): boolean => {
    if (where.and) return where.and.every((w) => matches(doc, w))
    const [[path, op]] = Object.entries(where) as [
      string,
      { in?: unknown[]; not_equals?: unknown },
    ][]
    const value =
      path === 'quiz.questions' ? (doc.quiz as { questions?: string[] })?.questions : doc[path]
    const values = Array.isArray(value) ? value : [value]
    if (op.in) return values.some((v) => op.in!.includes(v))
    if (op.not_equals !== undefined) return value !== op.not_equals
    return false
  }
  const payload = {
    find: vi.fn(
      async ({ collection, where }: { collection: 'quizQuestions' | 'tours'; where: Where }) => ({
        docs: (data[collection] ?? []).filter((doc) => matches(doc, where as Clause)),
      }),
    ),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  }
  return { payload } as unknown as PayloadRequest & { payload: typeof payload }
}

describe('tour quiz question picker', () => {
  it('searches questions about the (unsaved) tour contents and keeps selected ones valid', () => {
    const where = quizQuestionFilterOptions({
      data: { contents: ['c1', { id: 'c2' }], quiz: { questions: ['owned'] } },
    } as never)
    expect(where).toEqual({
      or: [{ relatedTo: { in: ['c1', 'c2'] } }, { id: { in: ['owned'] } }],
    })
  })
})

describe('tour quiz validation', () => {
  const validate = (value: string[], req: PayloadRequest, id = 'tour') =>
    validateQuizQuestions(value, {
      data: { contents: ['c1'] },
      req,
      id,
    } as never)

  it('accepts content questions on tour contents and its own tour questions', async () => {
    const req = fakeRequest({
      quizQuestions: [
        { id: 'q1', prompt: 'On c1', relatedTo: ['c1', 'c9'] },
        { id: 'own', prompt: 'Tour only', relatedTo: [] },
      ],
      tours: [{ id: 'tour', title: 'This', quiz: { questions: ['own'] } }],
    })
    expect(await validate(['q1', 'own'], req)).toBe(true)
  })

  it('rejects questions whose contents were removed from the tour', async () => {
    const req = fakeRequest({
      quizQuestions: [{ id: 'q2', prompt: 'On c2', relatedTo: ['c2'] }],
    })
    expect(await validate(['q2'], req)).toMatch(/«On c2»/)
  })

  it("rejects another tour's own questions sent through the API", async () => {
    const req = fakeRequest({
      quizQuestions: [{ id: 'own', prompt: 'Other', relatedTo: [] }],
      tours: [{ id: 'other', title: 'Other tour', quiz: { questions: ['own'] } }],
    })
    expect(await validate(['own'], req)).toMatch(/«Other tour»/)
  })
})

describe('quiz question cleanup', () => {
  it('deletes only tour-owned questions that no quiz lists anymore', async () => {
    const req = fakeRequest({
      quizQuestions: [
        { id: 'orphan', relatedTo: [] },
        { id: 'shared-content', relatedTo: ['c1'] },
        { id: 'still-used', relatedTo: [] },
      ],
      tours: [{ id: 'other', quiz: { questions: ['still-used'] } }],
    })
    await deleteUnownedTourQuestions(req, ['orphan', 'shared-content', 'still-used'])
    expect(req.payload.delete).toHaveBeenCalledTimes(1)
    expect(req.payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['orphan'] } } }),
    )
  })

  it('unlinks a deleted content, deleting questions it was the last link of', async () => {
    const req = fakeRequest({
      quizQuestions: [
        { id: 'both', relatedTo: ['gone', 'kept'] },
        { id: 'only', relatedTo: ['gone'] },
      ],
    })
    await detachDeletedContentFromQuestions({ id: 'gone', req } as never)
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'both', data: { relatedTo: ['kept'] } }),
    )
    expect(req.payload.delete).toHaveBeenCalledWith(expect.objectContaining({ id: 'only' }))
  })

  it('removes a deleted question from every quiz listing it', async () => {
    const req = fakeRequest({ tours: [{ id: 't', quiz: { questions: ['a', 'gone'] } }] })
    await detachDeletedQuestionFromTours(req, 'gone')
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't', data: { quiz: { questions: ['a'] } } }),
    )
  })
})

describe('quiz answers never reach the browser through tour or attempt reads', () => {
  const findField = (fields: Field[], name: string): Field | undefined => {
    for (const field of fields) {
      if ('name' in field && field.name === name) return field
      if (field.type === 'tabs') {
        for (const tab of (field as TabsField).tabs) {
          if ('name' in tab && tab.name === name) return { ...tab, type: 'group' } as Field
          const found = findField(tab.fields, name)
          if (found) return found
        }
      }
    }
  }

  it('never populates quiz questions inside tours', () => {
    const quiz = findField(Tour.fields, 'quiz') as { fields: Field[] }
    expect((findField(quiz.fields, 'questions') as RelationshipField).maxDepth).toBe(0)
  })

  it('never populates questions inside attempts', () => {
    expect((findField(QuizAttempts.fields, 'correctQuestions') as RelationshipField).maxDepth).toBe(
      0,
    )
    const answers = findField(QuizAttempts.fields, 'answers') as { fields: Field[] }
    expect((findField(answers.fields, 'question') as RelationshipField).maxDepth).toBe(0)
  })
})

describe('quiz attempt access', () => {
  const access = QuizAttempts.access!
  beforeEach(() => vi.clearAllMocks())

  it('is never created or edited through the API', async () => {
    expect(await access.create!({ req: {} as PayloadRequest } as never)).toBe(false)
    expect(await access.update!({ req: {} as PayloadRequest } as never)).toBe(false)
  })

  it('hides attempts from anonymous readers and scopes users to their own', async () => {
    expect(await access.read!({ req: { user: null } as PayloadRequest } as never)).toBe(false)
    const req = {
      user: { id: 'visitor', roles: [] },
      payload: { find: vi.fn(async () => ({ docs: [] })) },
    } as unknown as PayloadRequest
    expect(await access.read!({ req } as never)).toEqual({ user: { equals: 'visitor' } })
  })
})
