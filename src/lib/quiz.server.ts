import 'server-only'

import config from '@/payload.config'
import type { ContentImage, QuizQuestion } from '@/payload-types'
import { after } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'
import { enqueueTranslation, normalizeLocale, resolveLocalized } from './localized'
import { tourQuizQuestionIds } from './quiz-ownership'
import {
  CORRECT_ANSWER,
  gradeQuiz,
  optionKey,
  questionView,
  resolveOption,
  SCORE_BANDS,
} from './quiz-core'

/**
 * Server side of the visitor quiz: localized question reads, the secret-bound
 * wrappers of `quiz-core`, and cached statistics. `server-only` makes any
 * client import a build error, so neither full questions (with answers) nor
 * the HMAC secret can end up in a browser bundle.
 */

const ORIGIN = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000'

function secret() {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is required to key quiz options')
  return value
}

/** Full questions stay on the server; image populated for the reduced view. */
export type ServerQuizQuestion = Omit<QuizQuestion, 'image'> & { image: ContentImage | null }

export type TourQuiz = {
  /** `contentIds` in tour order: index < stepsCompleted means "visited". */
  tour: { id: string; title: string; stopCount: number; contentIds: string[] }
  questions: ServerQuizQuestion[]
}

/**
 * Questions in the visitor's language, in the given order. They are read with
 * the same receipt-based contract as other editorial copy (`resolveLocalized`):
 * a missing translation renders the English fallback now and is queued in the
 * background, so the next visitor gets it. Deleted questions are skipped.
 */
async function loadQuizQuestions(ids: string[], lng: string): Promise<ServerQuizQuestion[]> {
  if (!ids.length) return []
  const payload = await getPayload({ config })
  const locale = normalizeLocale(lng) ?? 'en'
  const states = await Promise.all(
    // Questions aren't readable by visitors (they carry the answer), so this
    // server-only read skips access; only reduced views leave the server.
    ids.map((id) =>
      resolveLocalized(payload, ORIGIN, {
        collection: 'quizQuestions',
        id,
        locale,
        overrideAccess: true,
      }),
    ),
  )
  const missing = states.flatMap((state) =>
    state.kind === 'miss' || state.kind === 'stale' ? [state.doc.id] : [],
  )
  if (missing.length && locale !== 'en') {
    after(() =>
      Promise.all(
        missing.map((id) =>
          enqueueTranslation(ORIGIN, { collection: 'quizQuestions', id, locale }),
        ),
      ),
    )
  }
  const docs = states.flatMap((state) => (state.kind === 'not-found' ? [] : [state.doc]))

  const imageIds = docs.flatMap((q) => (typeof q.image === 'string' ? [q.image] : []))
  const images = imageIds.length
    ? (
        await payload.find({
          collection: 'contentImages',
          where: { id: { in: imageIds } },
          locale,
          depth: 0,
          limit: imageIds.length,
          pagination: false,
        })
      ).docs
    : []
  return docs.map((q) => ({ ...q, image: images.find((image) => image.id === q.image) ?? null }))
}

/** The tour's current quiz in the visitor's language; `null` for an unknown tour. */
export const getTourQuiz = cache(async (tourId: string, lng: string): Promise<TourQuiz | null> => {
  const payload = await getPayload({ config })
  const tour = await payload
    .findByID({
      collection: 'tours',
      id: tourId,
      depth: 0,
      select: { title: true, contents: true, quiz: true },
    })
    .catch(() => null)
  if (!tour) return null
  return {
    tour: {
      id: tour.id,
      title: tour.title,
      stopCount: tour.contents?.length ?? 0,
      contentIds: (tour.contents ?? []).map((c) => (typeof c === 'string' ? c : c.id)),
    },
    questions: await loadQuizQuestions(tourQuizQuestionIds(tour), lng),
  }
})

/**
 * The questions an attempt answered, which may differ from the tour's current
 * quiz (staff edits after the attempt). Missing entries were deleted since.
 */
export const getAttemptQuestions = cache((ids: string[], lng: string) =>
  loadQuizQuestions(ids, lng),
)

/** Reduced, shuffled questions for the browser: no correct answer, no explanation. */
export const quizQuestionViews = (quiz: TourQuiz) =>
  quiz.questions.map((question) => questionView(secret(), question))

export const resolveQuizOption = (question: ServerQuizQuestion, key: string) =>
  resolveOption(secret(), question, key)

export const gradeTourQuiz = (quiz: TourQuiz, choices: Record<string, string | undefined>) =>
  gradeQuiz(secret(), quiz.questions, choices)

/** The key of the correct option, revealed only after an answer is recorded. */
export const correctOptionKey = (question: Pick<ServerQuizQuestion, 'id'>) =>
  optionKey(secret(), question.id, CORRECT_ANSWER)

/** Key of any stored answer ('correct' or a wrong row ID), for the result review. */
export const storedAnswerKey = (questionId: string, answer: string) =>
  optionKey(secret(), questionId, answer)

/** Cache tag of a tour's statistics, expired by every new attempt. */
export const quizStatsTag = (tourId: string) => `quiz-stats:${tourId}`

export type QuizStats = {
  attempts: number
  bands: number[]
  correctByQuestion: Record<string, number>
  /** Attempts that included each question; the per-question rate's denominator. */
  answeredByQuestion: Record<string, number>
}

/**
 * Aggregate statistics with plain indexed counts: one per score band and one
 * per question (`correctQuestions` avoids cross-element array matches). Cached
 * per tour and question set; `submitQuizAttempt` expires the tag.
 */
export function getQuizStats(tourId: string, questionIds: string[]): Promise<QuizStats> {
  return unstable_cache(
    async () => {
      const payload = await getPayload({ config })
      const count = async (where: Where) =>
        (
          await payload.count({
            collection: 'quizAttempts',
            where: { and: [{ tour: { equals: tourId } }, where] },
          })
        ).totalDocs
      const [attempts, bands, correct, answered] = await Promise.all([
        count({}),
        Promise.all(
          SCORE_BANDS.map((band, index) =>
            count(
              index === 0
                ? { percent: { less_than_equal: band.max } }
                : {
                    and: [
                      { percent: { greater_than: band.min } },
                      { percent: { less_than_equal: band.max } },
                    ],
                  },
            ),
          ),
        ),
        Promise.all(questionIds.map((id) => count({ correctQuestions: { in: [id] } }))),
        // A single-field array match, so no cross-element ambiguity here.
        Promise.all(questionIds.map((id) => count({ 'answers.question': { in: [id] } }))),
      ])
      return {
        attempts,
        bands,
        correctByQuestion: Object.fromEntries(questionIds.map((id, i) => [id, correct[i]])),
        answeredByQuestion: Object.fromEntries(questionIds.map((id, i) => [id, answered[i]])),
      }
    },
    ['quiz-stats', tourId, ...questionIds],
    { tags: [quizStatsTag(tourId)] },
  )()
}

/** Attempts of this tour with a strictly lower percentage (per-visitor, so uncached). */
export async function countLowerAttempts(tourId: string, percent: number) {
  const payload = await getPayload({ config })
  return (
    await payload.count({
      collection: 'quizAttempts',
      where: { and: [{ tour: { equals: tourId } }, { percent: { less_than: percent } }] },
    })
  ).totalDocs
}
