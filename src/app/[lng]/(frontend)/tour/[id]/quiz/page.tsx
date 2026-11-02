import { getTourQuiz, quizQuestionViews } from '@/lib/quiz.server'
import { tourStepIndex } from '@/lib/tour-navigation'
import { notFound } from 'next/navigation'
import { QuizPageContent } from './GroupQuizBoard'

/**
 * Quiz entry (`/[lng]/tour/[id]/quiz?from=N`), outside the map layout. Only the
 * reduced question views cross into the client component: never pass the full
 * questions, whose `correctAnswer` would be serialized into the RSC payload.
 * `?q=` is read by the client, so moving between questions needs no server render.
 * A group's host gets the group's board instead of the quiz (GroupQuizBoard).
 */
export default async function QuizPage({
  params,
  searchParams,
}: PageProps<'/[lng]/tour/[id]/quiz'>) {
  const { lng, id } = await params
  const { from } = await searchParams
  const quiz = await getTourQuiz(id, lng)
  if (!quiz?.questions.length) notFound()
  // Without a valid cursor (e.g. a shared link), treat the tour as completed.
  const step = tourStepIndex(typeof from === 'string' ? from : '', quiz.tour.stopCount)

  return (
    <QuizPageContent
      tour={{
        id: quiz.tour.id,
        museumId: quiz.tour.museumId,
        title: quiz.tour.title,
        stopCount: quiz.tour.stopCount,
      }}
      questions={quizQuestionViews(quiz)}
      from={step ?? quiz.tour.stopCount}
    />
  )
}
