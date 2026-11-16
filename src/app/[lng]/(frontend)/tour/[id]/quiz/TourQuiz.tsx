'use client'

import { ActionFooter } from '@/components/mantine/ActionFooter'
import type { QuizQuestionView } from '@/lib/quiz-core'
import {
  tourNavigationPath,
  tourQuizResultPath,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { AppShellMain, Button, Center, Loader, Container, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { ArrowRight } from 'lucide-react'
import type { Route } from 'next'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { checkQuizAnswer, submitQuizAttempt } from './actions'
import { QuizContentDrawer } from './QuizContentDrawer'
import { QuizHeader, QuizIntro, QuizQuestion } from './QuizParts'
import { emptyQuizSession, type QuizSession, saveQuizSession, useQuizSession } from './quiz-session'
import { useGroupQuizGuest } from './group-quiz'

/** `museumId` builds "back to the map" (the tour's map lives in its museum's navigation). */
export type QuizTourSummary = { id: string; museumId: string; title: string; stopCount: number }

/**
 * The visitor quiz: an intro screen (`/quiz`), then one question per screen
 * (`/quiz?q=n`). Questions arrive already reduced and shuffled by the server;
 * each answer is checked by a Server Function and is final. `?q` changes use
 * `history.pushState`, which Next syncs with `useSearchParams` without a server
 * round trip, so Back/Forward and reloads keep working. Skipping ahead through
 * the URL is clamped to the first unanswered question.
 *
 * In a group, guests take this same quiz; `useGroupQuizGuest` reports their
 * progress and result to the host, and hands the quiz in when the host ends it.
 */
export function TourQuiz({
  tour,
  questions,
  from,
}: {
  tour: QuizTourSummary
  questions: QuizQuestionView[]
  /** Tour cursor the visitor came from: below `stopCount` means an early quiz. */
  from: number
}) {
  const { t } = useTranslation('tour-quiz')
  const { lng } = useParams<{ lng: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const [submitting, startSubmit] = useTransition()
  const [drawerContent, setDrawerContent] = useState<string | null>(null)
  const { session, restored, update, answered, lastReachable, index, goTo, leave } = useQuizCursor(
    tour.id,
    questions,
  )

  const { answer, pendingKey } = useAnswerCheck({ tourId: tour.id, lng, session, update })

  const submit = () =>
    startSubmit(async () => {
      try {
        const result = await submitQuizAttempt({
          tourId: tour.id,
          lng,
          stepsCompleted: from,
          choices: session.choices,
        })
        if (result.status === 'ok') {
          groupQuiz.finished(result.token)
          leave()
          router.push(tourQuizResultPath(lng, tour.id, result.token))
          return
        }
        notifications.show({
          color: 'red',
          title: t('This quiz has changed'),
          message: t('Reload the page to get the current questions.'),
        })
      } catch {
        notifications.show({
          color: 'red',
          title: t('Your results were not saved'),
          message: t('Check your connection and try again.'),
        })
      }
    })

  const groupQuiz = useGroupQuizGuest({
    tourId: tour.id,
    answered,
    total: questions.length,
    submit,
  })
  // Guests follow the host, so the way back to the map is the host's to take.
  const backHref = groupQuiz.active
    ? undefined
    : (withNavigationPosition(
        tourNavigationPath(lng, tour.museumId, tour.id, from),
        search.toString(),
      ) as Route)

  // A deep link to a question waits for the restored answers instead of flashing the intro.
  if (index !== null && !restored) {
    return (
      <AppShellMain>
        <Center py="xl">
          <Loader aria-label={t('Loading the quiz')} />
        </Center>
      </AppShellMain>
    )
  }

  if (index === null) {
    return (
      <QuizIntro
        tour={tour}
        questionCount={questions.length}
        unvisited={Math.max(0, tour.stopCount - from)}
        answered={restored ? answered : 0}
        mapHref={backHref}
        onStart={() => goTo(Math.min(lastReachable, questions.length - 1) + 1)}
        onRestart={() => {
          update(emptyQuizSession())
          goTo(1)
        }}
      />
    )
  }

  const question = questions[index]
  const feedback = session.feedback[question.id]
  const chosen = session.choices[question.id]
  const isLast = index === questions.length - 1

  return (
    <>
      {/* AppShellMain reserves room for the fixed footer below. */}
      <AppShellMain>
        <Container size="xs" px="md" pt="sm" pb="xl">
          <Stack gap="lg">
            <QuizHeader
              title={tour.title}
              backHref={backHref}
              index={index}
              total={questions.length}
              answered={answered}
            />

            <QuizQuestion
              question={question}
              feedback={feedback}
              chosen={chosen}
              pendingKey={pendingKey}
              onAnswer={(key) => answer(question.id, key)}
              onReadContent={setDrawerContent}
            />
          </Stack>
        </Container>
      </AppShellMain>

      <ActionFooter size="xs">
        <Button
          fullWidth
          size="md"
          disabled={!feedback}
          loading={isLast && submitting}
          rightSection={<ArrowRight size={18} />}
          onClick={isLast ? submit : () => goTo(index + 2)}
        >
          {isLast ? t('See your results') : t('Next question')}
        </Button>
      </ActionFooter>

      <QuizContentDrawer
        contentId={drawerContent}
        lng={lng}
        onClose={() => setDrawerContent(null)}
      />
    </>
  )
}

/**
 * Checks one answer on the server (the right answer never reaches the
 * browser before), one at a time, and stores the feedback in the session.
 */
function useAnswerCheck({
  tourId,
  lng,
  session,
  update,
}: {
  tourId: string
  lng: string
  session: QuizSession
  update: (next: QuizSession) => void
}) {
  const { t } = useTranslation('tour-quiz')
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [, startCheck] = useTransition()
  const answer = (questionId: string, key: string) => {
    if (session.feedback[questionId] || pendingKey) return
    setPendingKey(key)
    startCheck(async () => {
      try {
        const result = await checkQuizAnswer({ tourId, lng, questionId, key })
        if (result.status === 'ok') {
          const { status: _status, ...feedback } = result
          update({
            choices: { ...session.choices, [questionId]: key },
            feedback: { ...session.feedback, [questionId]: feedback },
          })
        } else {
          notifications.show({
            color: 'red',
            title: t('This quiz has changed'),
            message: t('Reload the page to get the current questions.'),
          })
        }
      } catch {
        notifications.show({
          color: 'red',
          title: t('Your answer was not checked'),
          message: t('Check your connection and choose your answer again.'),
        })
      } finally {
        setPendingKey(null)
      }
    })
  }
  return { answer, pendingKey }
}

/**
 * The visitor's saved answers and where they are in the quiz. The question
 * is the URL's `?q=` (1-based), clamped to the first unanswered one, so a
 * shared or stale link can't skip ahead; `goTo` writes it to the history.
 */
function useQuizCursor(tourId: string, questions: QuizQuestionView[]) {
  const search = useSearchParams()
  const saved = useQuizSession(tourId)
  const restored = saved !== null

  // Saved progress, minus answers to questions the staff removed since.
  const session = useMemo<QuizSession>(() => {
    if (!saved) return emptyQuizSession()
    const ids = new Set(questions.map((q) => q.id))
    const keep = <T,>(record: Record<string, T>) =>
      Object.fromEntries(Object.entries(record).filter(([id]) => ids.has(id)))
    return { choices: keep(saved.choices), feedback: keep(saved.feedback) }
  }, [saved, questions])

  const update = (next: QuizSession) => saveQuizSession(tourId, next)

  const answered = questions.filter((q) => session.feedback[q.id]).length
  const firstOpen = questions.findIndex((q) => !session.feedback[q.id])
  const lastReachable = firstOpen === -1 ? questions.length - 1 : firstOpen
  const requested = Number(search.get('q'))
  const index =
    Number.isInteger(requested) && requested >= 1 ? Math.min(requested - 1, lastReachable) : null

  const goTo = (questionNumber: number | null, replace = false) => {
    const params = new URLSearchParams(search)
    if (questionNumber === null) params.delete('q')
    else params.set('q', String(questionNumber))
    const url = `?${params}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
  }

  // Set once the attempt is saved: clearing the saved answers must not send the
  // visitor back to question 1 while the result page is loading.
  const leaving = useRef(false)

  // Normalize a URL pointing past the first unanswered question.
  useEffect(() => {
    if (leaving.current) return
    if (restored && index !== null && index + 1 !== requested) goTo(index + 1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the clamp changes
  }, [restored, index, requested])

  // The attempt is saved: drop the answers without bouncing back to question 1.
  const leave = () => {
    leaving.current = true
    saveQuizSession(tourId, null)
  }

  return { session, restored, update, answered, lastReachable, index, goTo, leave }
}
