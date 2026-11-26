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

// Tokens are published by guests as LiveKit attributes they control, so a
// hostile guest can send junk. `tourId` is validated strictly, but the token
// list is only a lookup key set: we sanitize it (see `sanitizeTokens`) instead
// of rejecting it, so one bad token can't blank every other guest's score.
// Generous bound on the raw list (the 200 cap applies after filtering), so junk
// entries are tolerated but a huge array is rejected before any work.
const MAX_INPUT_TOKENS = 1000
const tokensInput = z.object({ tourId: id, tokens: z.array(z.unknown()).max(MAX_INPUT_TOKENS) })

const MAX_TOKENS = 200

/** Keeps the valid (1-64 chars string), unique tokens, capped after filtering. */
function sanitizeTokens(tokens: unknown[]): string[] {
  const valid = tokens.filter(
    (token): token is string =>
      typeof token === 'string' && token.length >= 1 && token.length <= 64,
  )
  return [...new Set(valid)].slice(0, MAX_TOKENS)
}

export type GroupQuizScore = { token: string; score: number; total: number; percent: number }

/**
 * Scores for the group quiz board (GroupQuizBoard): the host received each
 * guest's result token through the group, and reads the scores with them.
 * A token is the same secret that opens the guest's own result page.
 */
export async function groupQuizScores(
  input: z.input<typeof tokensInput>,
): Promise<GroupQuizScore[]> {
  const parsed = tokensInput.safeParse(input)
  if (!parsed.success) return []
  const tokens = sanitizeTokens(parsed.data.tokens)
  if (!tokens.length) return []
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'quizAttempts',
    where: { token: { in: tokens }, tour: { equals: parsed.data.tourId } },
    limit: tokens.length,
    depth: 0,
    select: { token: true, score: true, total: true, percent: true },
  })
  return docs.map(({ token, score, total, percent }) => ({
    token,
    score: score ?? 0,
    total: total ?? 0,
    percent: percent ?? 0,
  }))
}
