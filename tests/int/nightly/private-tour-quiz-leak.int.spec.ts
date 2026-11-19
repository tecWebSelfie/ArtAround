import { afterAll, describe, expect, it } from 'vitest'
import { optionKey } from '@/lib/quiz-core'
import { BASE, call, Sandbox, type Account } from './helpers'

/**
 * Nightly QA 2026-11-18, flow C1 (area C: tour quiz).
 *
 * `getTourQuizForResult` (src/lib/quiz.server.ts) reads the tour with the
 * Local API and no `overrideAccess: false`/user, and neither the quiz page nor
 * the Server Functions of `tour/[id]/quiz/actions.ts` check that the visitor
 * may read the tour ("quiz links are public"). So a PRIVATE tour, which
 * `/en/tour/<id>` answers with 404, still hands anybody who knows its id:
 * - the quiz page (tour title, prompts, options),
 * - `checkQuizAnswer` (correct option key + explanation),
 * - `submitQuizAttempt` (a stored attempt and its result token), and the
 *   result page it opens (title, every prompt, explanation),
 * - through the tour editor's ownership validator, the title of the tour that
 *   owns a question, to a user who has no right to read that tour.
 * Expected: every one of them behaves as for an unknown tour (404 / 'invalid').
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const secret = () => process.env.PAYLOAD_SECRET ?? ''

type Fixture = {
  author: Account
  tourId: string
  title: string
  questions: { id: string; prompt: string; explanation: string }[]
}

/** A tour of `author` with two tour-owned questions, made private when asked. */
async function quizTour(author: Account, priv: boolean): Promise<Fixture> {
  const { museum, object } = await sandbox.anchors()
  const stops = [await sandbox.content(author, object), await sandbox.content(author, object)]
  const questions = []
  for (const n of [1, 2]) {
    const tag = Math.random().toString(36).slice(2, 7)
    const res = await call('POST', '/api/quizQuestions', {
      token: author.token,
      body: {
        prompt: `PRIVPROMPT-${tag}-${n}`,
        correctAnswer: `RIGHT-${tag}-${n}`,
        wrongAnswers: [{ text: 'w1' }, { text: 'w2' }, { text: 'w3' }],
        explanation: `PRIVEXPL-${tag}-${n}`,
        difficulty: 'easy',
      },
    })
    expect(res.status).toBe(201)
    questions.push({
      id: res.json.doc.id as string,
      prompt: res.json.doc.prompt as string,
      explanation: res.json.doc.explanation as string,
    })
  }
  const tour = await sandbox.tour(
    author,
    museum,
    stops.map((s) => s.id),
    { quiz: { questions: questions.map((q) => q.id) } },
  )
  expect(tour.status).toBe(201)
  const tourId = tour.json.doc.id as string
  if (priv) {
    const flip = await call('PATCH', `/api/tours/${tourId}`, {
      token: author.token,
      body: { visibility: 'private' },
    })
    expect(flip.status).toBe(200)
  }
  return { author, tourId, title: tour.json.doc.title as string, questions }
}

/** The ids of the quiz Server Functions, read from the client chunks of a quiz page. */
async function actionIds(publicTourId: string) {
  const html = await (await fetch(`${BASE}/en/tour/${publicTourId}/quiz`)).text()
  const chunks = [...new Set(html.match(/\/_next\/static\/[^"\\]+?\.js/g) ?? [])]
  for (const chunk of chunks) {
    const js = await (await fetch(BASE + chunk)).text()
    const find = (name: string) =>
      js.match(new RegExp(`"(4[0-9a-f]{20,})",[^"]{0,80}?"${name}"`))?.[1]
    const check = find('checkQuizAnswer')
    const submit = find('submitQuizAttempt')
    if (check && submit) return { check, submit }
  }
  throw new Error('quiz action ids not found in the page chunks')
}

/** POSTs a Server Function the way the browser does and returns its RSC text. */
async function action(id: string, tourId: string, args: unknown, cookie?: string) {
  const res = await fetch(`${BASE}/en/tour/${tourId}/quiz`, {
    method: 'POST',
    headers: {
      'next-action': id,
      'content-type': 'text/plain;charset=UTF-8',
      accept: 'text/x-component',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify([args]),
  })
  return { status: res.status, text: await res.text() }
}

describe('quiz of a private tour', () => {
  it('is not served as a page to anonymous visitors or other users', async () => {
    const [author, other] = await Promise.all([sandbox.user('quizowner'), sandbox.user('other')])
    const tour = await quizTour(author, true)
    // Control: the tour page itself already hides it.
    expect((await call('GET', `/en/tour/${tour.tourId}`)).status).toBe(404)
    for (const cookie of [undefined, `payload-token=${other.token}`]) {
      for (const path of [`/en/tour/${tour.tourId}/quiz`, `/en/tour/${tour.tourId}/quiz?q=1`]) {
        const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {} })
        const html = await res.text()
        expect(html).not.toContain(tour.title)
        expect(html).not.toContain(tour.questions[0].prompt)
        expect(res.status).toBe(404)
      }
    }
  })

  it('does not reveal the answer and explanation through checkQuizAnswer', async () => {
    const author = await sandbox.user('quizowner')
    const [open, tour] = await Promise.all([quizTour(author, false), quizTour(author, true)])
    const ids = await actionIds(open.tourId)
    const [q1, q2] = tour.questions
    // The option keys are the HMACs the page would have sent.
    const check = await action(ids.check, tour.tourId, {
      tourId: tour.tourId,
      lng: 'en',
      questionId: q1.id,
      key: optionKey(secret(), q1.id, 'correct'),
    })
    expect(check.text).not.toContain(q1.explanation)
    expect(check.text).not.toContain('"status":"ok"')
  })

  it('does not store an attempt or open a result page for it', async () => {
    const author = await sandbox.user('quizowner')
    const [open, tour] = await Promise.all([quizTour(author, false), quizTour(author, true)])
    const ids = await actionIds(open.tourId)
    const [q1, q2] = tour.questions
    const submit = await action(ids.submit, tour.tourId, {
      tourId: tour.tourId,
      lng: 'en',
      stepsCompleted: 2,
      choices: {
        [q1.id]: optionKey(secret(), q1.id, 'correct'),
        [q2.id]: optionKey(secret(), q2.id, 'correct'),
      },
    })
    const token = submit.text.match(/"status":"ok","token":"([^"]+)"/)?.[1]
    expect(token).toBeUndefined()
    if (token) {
      const result = await fetch(`${BASE}/en/tour/${tour.tourId}/quiz/result/${token}`)
      expect(result.status).toBe(404)
      expect(await result.text()).not.toContain(tour.title)
    }
  })

  it('does not name the private tour to a user who tries to reuse its question', async () => {
    const [owner, other] = await Promise.all([sandbox.user('quizowner'), sandbox.user('other')])
    const priv = await quizTour(owner, true)
    const mine = await quizTour(other, false)
    const patch = await call('PATCH', `/api/tours/${mine.tourId}`, {
      token: other.token,
      body: { quiz: { questions: [priv.questions[0].id] } },
    })
    expect(patch.status).toBe(400)
    expect(JSON.stringify(patch.json)).not.toContain(priv.title)
  })
})
