import { describe, expect, it } from 'vitest'
import { call, Sandbox } from './helpers'

/**
 * Nightly QA 2026-11-28 (area A, flow 6: relation paths in `where`).
 *
 * `quizQuestions` are readable by their writer and super admins only (their
 * `correctAnswer` must not reach a quiz taker before they answer,
 * docs/tour-quiz.md). Payload does not apply the read rule of a related
 * collection to a `where` that walks through it, so any signed-in user can
 * run
 *   GET /api/tours?where[quiz.questions.correctAnswer][equals]=<guess>
 * and read `totalDocs` 1 or 0 (or use `like` prefixes to spell the answer out
 * letter by letter), for every question of every public tour.
 * Expected: the filter on a field the caller cannot read is refused or never
 * matches, so a right and a wrong guess answer the same.
 * Needs a seeded tour that has a quiz (`pnpm seed:e2e`).
 */
const sandbox = new Sandbox()

describe('filtering tours by the correct answer of their quiz', () => {
  it('does not tell a right guess from a wrong one', async () => {
    const [outsider, admin] = await Promise.all([sandbox.user('quizpeek'), sandbox.admin()])
    const questions = await call('GET', '/api/quizQuestions?depth=0&limit=1', { token: admin })
    const answer = questions.json.docs?.[0]?.correctAnswer as string | undefined
    if (!answer) throw new Error('no quiz question in the database: run `pnpm seed:e2e`')

    const guess = (value: string) =>
      call(
        'GET',
        `/api/tours?depth=0&limit=1&where[quiz.questions.correctAnswer][equals]=${encodeURIComponent(value)}`,
        { token: outsider.token },
      )
    const right = await guess(answer)
    const wrong = await guess(`${answer}-zzz-not-the-answer`)

    // Same outcome for both: both refused, or both matching nothing.
    expect([right.status, right.json.totalDocs ?? 0]).toEqual([
      wrong.status,
      wrong.json.totalDocs ?? 0,
    ])
    await sandbox.cleanup()
  })
})
