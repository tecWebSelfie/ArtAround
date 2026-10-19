import { createHmac, randomInt } from 'node:crypto'
import type { QuizQuestion } from '@/payload-types'

/**
 * Pure quiz logic: opaque option keys, shuffling, grading and statistics.
 *
 * The secret is a parameter so this file stays importable by tests; app code
 * must go through `src/lib/quiz.server.ts`, which binds `PAYLOAD_SECRET` behind
 * `server-only`. Nothing here may ever return which key is correct, except the
 * explicit reveal helpers used after an answer has been recorded.
 */

/** The stored `answer` value for the correct option; wrong options use their row ID. */
export const CORRECT_ANSWER = 'correct'
/** Stored when a submission lacks a valid choice (e.g. a question added mid-quiz). */
export const UNANSWERED = 'unanswered'

/** What the browser receives per option: text and a key that reveals nothing. */
export type QuizOptionView = { key: string; text: string }

/** A question as sent to the browser before answering (no answer, no explanation). */
export type QuizQuestionView = {
  id: string
  prompt: string
  image: { url: string; alt: string } | null
  /** Related contents, for "read the content again"; empty for tour-owned questions. */
  contentIds: string[]
  options: QuizOptionView[]
}

export type GradedChoice = { question: string; answer: string; correct: boolean }

type GradableQuestion = Pick<QuizQuestion, 'id' | 'correctAnswer' | 'wrongAnswers'>

/**
 * HMAC keeps keys indistinguishable: ObjectId row IDs encode creation time, so
 * sending them raw could reveal the odd-one-out correct answer. Keys are stable
 * per question/answer, so choices stored before a reload still resolve.
 */
export function optionKey(secret: string, questionId: string, answer: string) {
  return createHmac('sha256', secret)
    .update(`${questionId}:${answer}`)
    .digest('base64url')
    .slice(0, 16)
}

/** Fisher-Yates with a CSPRNG; `Math.random` order is predictable enough to matter here. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Every stored answer of a question with its text, correct first. */
function answers(question: GradableQuestion) {
  return [
    { answer: CORRECT_ANSWER, text: question.correctAnswer },
    ...(question.wrongAnswers ?? []).flatMap((row) =>
      row.id ? [{ answer: row.id, text: row.text }] : [],
    ),
  ]
}

/** The browser payload for one question: four shuffled options with opaque keys. */
export function questionView(
  secret: string,
  question: GradableQuestion & Pick<QuizQuestion, 'prompt' | 'image' | 'relatedTo'>,
): QuizQuestionView {
  const image = typeof question.image === 'object' ? question.image : null
  return {
    id: question.id,
    prompt: question.prompt,
    image: image?.url ? { url: image.url, alt: image.alt ?? '' } : null,
    contentIds: (question.relatedTo ?? []).map((c) => (typeof c === 'string' ? c : c.id)),
    options: shuffle(answers(question)).map(({ answer, text }) => ({
      key: optionKey(secret, question.id, answer),
      text,
    })),
  }
}

/** Maps a key back to the stored answer by recomputing the four candidate keys. */
export function resolveOption(
  secret: string,
  question: GradableQuestion,
  key: string,
): GradedChoice | null {
  const match = answers(question).find(
    ({ answer }) => optionKey(secret, question.id, answer) === key,
  )
  return match
    ? { question: question.id, answer: match.answer, correct: match.answer === CORRECT_ANSWER }
    : null
}

/**
 * Grades a whole submission against the tour's current questions (never the
 * IDs the browser chose to send). Missing or unknown keys count as wrong.
 */
export function gradeQuiz(
  secret: string,
  questions: GradableQuestion[],
  choices: Record<string, string | undefined>,
) {
  const answersGiven = questions.map(
    (question) =>
      resolveOption(secret, question, choices[question.id] ?? '') ?? {
        question: question.id,
        answer: UNANSWERED,
        correct: false,
      },
  )
  const score = answersGiven.filter((a) => a.correct).length
  return { answers: answersGiven, score, total: questions.length }
}

/** Score bands of the distribution chart: percentages, since quizzes change over time. */
export const SCORE_BANDS = [
  { label: '0–20%', min: 0, max: 20 },
  { label: '21–40%', min: 20, max: 40 },
  { label: '41–60%', min: 40, max: 60 },
  { label: '61–80%', min: 60, max: 80 },
  { label: '81–100%', min: 80, max: 100 },
] as const

/** Band index of a score; band 0 includes 0%, every other band its upper bound. */
export function scoreBand(score: number, total: number) {
  const percent = total ? (score / total) * 100 : 0
  const index = SCORE_BANDS.findIndex((band) => percent <= band.max)
  return index === -1 ? SCORE_BANDS.length - 1 : index
}

/** Comparisons stay hidden below this many attempts: noisy, and could single out visitors. */
export const MIN_ATTEMPTS_FOR_STATS = 10

/** Share of other attempts this one beat (ties do not count), as a 0–100 integer. */
export function betterThanPercent(lowerScores: number, totalAttempts: number) {
  const others = totalAttempts - 1
  return others > 0 ? Math.round((lowerScores / others) * 100) : 0
}
