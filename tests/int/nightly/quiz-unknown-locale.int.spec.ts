import { afterAll, describe, expect, it } from 'vitest'
import { optionKey } from '@/lib/quiz-core'
import { BASE, call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-18, finding N5 (area C: tour quiz).
 *
 * `checkQuizAnswer` / `submitQuizAttempt` (tour/[id]/quiz/actions.ts) only
 * require `lng` to be a 2-8 character string, so `lng: 'xx'` stores a
 * `quizAttempts` row with `locale: 'xx'` (and asks for a translation into a
 * language the app does not have). Expected: an unsupported language answers
 * `{status:'invalid'}` and nothing is stored; a supported one still works.
 */
const sandbox = new Sandbox()
afterAll(() => sandbox.cleanup())

const secret = () => process.env.PAYLOAD_SECRET ?? ''

/** The ids of the quiz Server Functions, read from the client chunks of a quiz page. */
async function actionIds(tourId: string) {
  const html = await (await fetch(`${BASE}/en/tour/${tourId}/quiz`)).text()
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

async function action(id: string, tourId: string, args: unknown) {
  const res = await fetch(`${BASE}/en/tour/${tourId}/quiz`, {
    method: 'POST',
    headers: {
      'next-action': id,
      'content-type': 'text/plain;charset=UTF-8',
      accept: 'text/x-component',
    },
    body: JSON.stringify([args]),
  })
  return { status: res.status, text: await res.text() }
}

describe('quiz actions and the language', () => {
  it('refuse an unknown language and store nothing for it', async () => {
    const author = await sandbox.user('quizlng')
    const { museum, object } = await sandbox.anchors()
    const stops = [await sandbox.content(author, object), await sandbox.content(author, object)]
    const q = await call('POST', '/api/quizQuestions', {
      token: author.token,
      body: {
        prompt: 'LNGPROMPT',
        correctAnswer: 'RIGHT',
        wrongAnswers: [{ text: 'w1' }, { text: 'w2' }, { text: 'w3' }],
        explanation: 'LNGEXPL',
        difficulty: 'easy',
      },
    })
    expect(q.status).toBe(201)
    const questionId = q.json.doc.id as string
    const tour = await sandbox.tour(
      author,
      museum,
      stops.map((s) => s.id),
      {
        quiz: { questions: [questionId] },
      },
    )
    expect(tour.status).toBe(201)
    const tourId = tour.json.doc.id as string
    const ids = await actionIds(tourId)
    const choices = { [questionId]: optionKey(secret(), questionId, 'correct') }
    const submit = (lng: string) =>
      action(ids.submit, tourId, { tourId, lng, stepsCompleted: 1, choices })

    const admin = await sandbox.admin()
    const stored = async (locale: string) =>
      (
        await call(
          'GET',
          `/api/quizAttempts?where[tour][equals]=${tourId}&where[locale][equals]=${locale}&limit=0&depth=0`,
          { token: admin },
        )
      ).json.docs as { id: string }[]

    // Control: a supported language is graded and stored.
    expect((await submit('en')).text).toContain('"status":"ok"')
    expect(await stored('en')).toHaveLength(1)

    expect((await submit('xx')).text).not.toContain('"status":"ok"')
    expect(await stored('xx')).toHaveLength(0)

    const check = await action(ids.check, tourId, {
      tourId,
      lng: 'xx',
      questionId,
      key: optionKey(secret(), questionId, 'correct'),
    })
    expect(check.text).not.toContain('"status":"ok"')

    // Attempts are removed with their tour (cleanup), nothing else to delete.
  })
})
