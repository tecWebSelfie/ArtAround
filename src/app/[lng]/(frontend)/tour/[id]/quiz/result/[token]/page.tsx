import config from '@/payload.config'
import {
  CORRECT_ANSWER,
  MIN_ATTEMPTS_FOR_STATS,
  SCORE_BANDS,
  betterThanPercent,
  scoreBand,
} from '@/lib/quiz-core'
import {
  countLowerAttempts,
  getAttemptQuestions,
  getQuizStats,
  getTourQuiz,
} from '@/lib/quiz.server'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { QuizResult, type QuizReviewItem } from './QuizResult'

/**
 * Result of one attempt, addressed by its unguessable token so it can be
 * shared (a teacher, a family) without exposing other visitors' attempts.
 * Correct answers and explanations are revealed here by design: the attempt is
 * already graded and stored. The review follows the attempt's own questions,
 * not the tour's current quiz, which staff may have edited since.
 */
export default async function QuizResultPage({
  params,
}: PageProps<'/[lng]/tour/[id]/quiz/result/[token]'>) {
  const { lng, id, token } = await params
  const payload = await getPayload({ config })
  const attempt = (
    await payload.find({
      collection: 'quizAttempts',
      where: { and: [{ token: { equals: token } }, { tour: { equals: id } }] },
      depth: 0,
      limit: 1,
      pagination: false,
    })
  ).docs[0]
  const quiz = await getTourQuiz(id, lng)
  if (!attempt || !quiz) notFound()

  const answers = attempt.answers ?? []
  const questionIds = answers.map((a) =>
    typeof a.question === 'string' ? a.question : a.question.id,
  )
  const [questions, stats, lower] = await Promise.all([
    getAttemptQuestions(questionIds, lng),
    getQuizStats(id, questionIds),
    countLowerAttempts(id, attempt.percent),
  ])
  const withStats = stats.attempts >= MIN_ATTEMPTS_FOR_STATS
  const visited = new Set(quiz.tour.contentIds.slice(0, attempt.stepsCompleted))

  const review: QuizReviewItem[] = answers.map((given, index) => {
    const question = questions.find((q) => q.id === questionIds[index])
    if (!question) return { id: questionIds[index], missing: true, correct: given.correct }
    const yourAnswer =
      given.answer === CORRECT_ANSWER
        ? question.correctAnswer
        : (question.wrongAnswers.find((row) => row.id === given.answer)?.text ?? null)
    const contentIds = (question.relatedTo ?? []).map((c) => (typeof c === 'string' ? c : c.id))
    const answered = stats.answeredByQuestion[question.id] ?? 0
    return {
      id: question.id,
      missing: false,
      prompt: question.prompt,
      correct: given.correct,
      yourAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? null,
      contentIds,
      // Only stops of this tour can be "not visited yet"; other contents are just linked.
      unvisited: contentIds.some((c) => quiz.tour.contentIds.includes(c) && !visited.has(c)),
      percentCorrect:
        withStats && answered
          ? Math.round(((stats.correctByQuestion[question.id] ?? 0) / answered) * 100)
          : null,
    }
  })

  const ownBand = scoreBand(attempt.score, attempt.total)
  return (
    <QuizResult
      tour={{ id: quiz.tour.id, title: quiz.tour.title }}
      score={attempt.score}
      total={attempt.total}
      percent={attempt.percent}
      stepsCompleted={attempt.stepsCompleted}
      comparison={
        withStats
          ? {
              betterThan: betterThanPercent(lower, stats.attempts),
              bands: SCORE_BANDS.map((band, i) => ({
                label: band.label,
                visitors: stats.bands[i],
                own: i === ownBand,
              })),
            }
          : null
      }
      review={review}
    />
  )
}
