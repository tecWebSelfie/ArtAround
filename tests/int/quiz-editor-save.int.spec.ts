// `saveQuizQuestions` (the tour editor's quiz save) against Payload's REST API
// faked with MSW: kept content questions return after the nearest question
// that preceded them, those whose contents left the tour are dropped, and a
// failed save leaves nothing behind.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { QuizDraft } from '@/components/editing/forms/QuizEditor'

const writes: string[] = []
let nextId = 0
const server = setupServer(
  http.post('*/api/quizQuestions', () => {
    const id = `new${++nextId}`
    writes.push(`create ${id}`)
    return HttpResponse.json({ doc: { id } })
  }),
  http.patch<{ id: string }>('*/api/quizQuestions/:id', ({ params }) => {
    writes.push(`update ${params.id}`)
    return HttpResponse.json({ doc: { id: params.id } })
  }),
  http.delete<{ id: string }>('*/api/quizQuestions/:id', ({ params }) => {
    writes.push(`delete ${params.id}`)
    return HttpResponse.json({ doc: { id: params.id } })
  }),
)
// The SDK keeps the `fetch` it finds when created: import it once MSW has
// patched the global one.
let saveQuizQuestions: typeof import('@/components/editing/forms/QuizEditor').saveQuizQuestions
beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' })
  ;({ saveQuizQuestions } = await import('@/components/editing/forms/QuizEditor'))
})
afterEach(() => {
  server.resetHandlers()
  writes.length = 0
  nextId = 0
})
afterAll(() => server.close())

const draft = (id?: string): QuizDraft => ({
  id,
  prompt: `Question ${id ?? 'new'}`,
  correctAnswer: 'Yes',
  wrongAnswers: ['No', 'Maybe', 'Never'],
  explanation: '',
})

describe('saveQuizQuestions', () => {
  it('puts kept questions after their nearest surviving predecessor', async () => {
    // Stored: [d0, k1, d2, k3]; the author deletes d0 and d2, adds one.
    const { questions } = await saveQuizQuestions({
      quiz: [draft()],
      saved: [draft('d0'), draft('d2')],
      kept: [
        { id: 'k1', after: ['d0'], contents: ['c1'] },
        { id: 'k3', after: ['d2', 'k1', 'd0'], contents: null },
      ],
      stops: ['c1'],
    })
    expect(questions).toEqual(['k1', 'k3', 'new1'])
  })

  it('keeps the stored order when nothing moved, and drops questions off the tour', async () => {
    const { questions } = await saveQuizQuestions({
      quiz: [draft('d0'), draft('d2')],
      saved: [draft('d0'), draft('d2')],
      kept: [
        { id: 'k1', after: ['d0'], contents: ['c1'] },
        { id: 'k3', after: ['d2', 'k1', 'd0'], contents: ['gone'] },
      ],
      stops: ['c1'],
    })
    expect(questions).toEqual(['d0', 'k1', 'd2'])
  })

  it('undoes its own writes when one of them fails', async () => {
    server.use(http.patch('*/api/quizQuestions/bad', () => HttpResponse.json({}, { status: 400 })))
    await expect(
      saveQuizQuestions({
        quiz: [draft('d0'), draft('bad'), draft()],
        saved: [draft('d0'), draft('bad')],
        kept: [],
        stops: [],
      }),
    ).rejects.toBeTruthy()
    expect(writes).toEqual(expect.arrayContaining(['delete new1', 'update d0']))
    expect(writes.filter((write) => write === 'update d0')).toHaveLength(2)
  })
})
