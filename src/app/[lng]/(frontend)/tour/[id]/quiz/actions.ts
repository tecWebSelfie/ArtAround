'use server'

import config from '@/payload.config'
import { newQuizAttemptToken } from '@/collections/QuizAttempts'
import {
  correctOptionKey,
  getTourQuiz,
  gradeTourQuiz,
  quizStatsTag,
  resolveQuizOption,
} from '@/lib/quiz.server'
import { updateTag } from 'next/cache'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

/**
 * Quiz Server Functions. Next exposes each export as a public POST endpoint,
 * so every argument is validated and nothing from the browser is trusted:
 * questions are always re-read from the tour, keys are re-resolved with the
 * server secret, and scores are recomputed here.
 */

const id = z.string().min(1).max(64)
const key = z.string().min(1).max(64)

const checkInput = z.object({ tourId: id, lng: z.string().min(2).max(8), questionId: id, key })

export type CheckQuizAnswerResult =
  | { status: 'ok'; correct: boolean; correctKey: string; explanation: string | null }
  | { status: 'invalid' }

/**
 * Immediate feedback for one answer. Revealing the correct key here is by
 * design (answers are final in the UI); `submitQuizAttempt` still re-grades,
 * so a forged client cannot change the stored score, only peek.
 */
export async function checkQuizAnswer(
  input: z.input<typeof checkInput>,
): Promise<CheckQuizAnswerResult> {
  const parsed = checkInput.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const { tourId, lng, questionId } = parsed.data
  const question = (await getTourQuiz(tourId, lng))?.questions.find((q) => q.id === questionId)
  const choice = question && resolveQuizOption(question, parsed.data.key)
  if (!question || !choice) return { status: 'invalid' }
  return {
    status: 'ok',
    correct: choice.correct,
    correctKey: correctOptionKey(question),
    explanation: question.explanation ?? null,
  }
}

const submitInput = z.object({
  tourId: id,
  lng: z.string().min(2).max(8),
  stepsCompleted: z.number().int().min(0).max(10_000),
  choices: z.record(id, key),
})

export type SubmitQuizAttemptResult = { status: 'ok'; token: string } | { status: 'invalid' }

/** Grades the whole quiz from the database, stores the attempt and expires the statistics. */
export async function submitQuizAttempt(
  input: z.input<typeof submitInput>,
): Promise<SubmitQuizAttemptResult> {
  const parsed = submitInput.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const { tourId, lng, stepsCompleted, choices } = parsed.data
  const quiz = await getTourQuiz(tourId, lng)
  if (!quiz?.questions.length) return { status: 'invalid' }

  const payload = await getPayload({ config })
  // Optional sign-in: attempts are anonymous unless a session cookie is present.
  const { user } = await payload.auth({ headers: await headers() })
  const graded = gradeTourQuiz(quiz, choices)
  const token = newQuizAttemptToken()

  await payload.create({
    collection: 'quizAttempts',
    data: {
      token,
      tour: tourId,
      user: user?.collection === 'users' ? user.id : null,
      locale: lng,
      stepsCompleted: Math.min(stepsCompleted, quiz.tour.stopCount),
      answers: graded.answers,
      correctQuestions: graded.answers.filter((a) => a.correct).map((a) => a.question),
      score: graded.score,
      total: graded.total,
      percent: graded.total ? Math.round((graded.score / graded.total) * 100) : 0,
    },
  })
  // Read-your-own-write: the result page this visitor opens next includes them.
  updateTag(quizStatsTag(tourId))
  return { status: 'ok', token }
}
