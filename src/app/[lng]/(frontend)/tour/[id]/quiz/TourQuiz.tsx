'use client'

import type { QuizQuestionView } from '@/lib/quiz-core'
import {
  tourNavigationPath,
  tourQuizResultPath,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import {
  ActionIcon,
  Alert,
  AppShellFooter,
  AppShellMain,
  AspectRatio,
  Box,
  Button,
  Center,
  Loader,
  type ButtonProps,
  Container,
  Group,
  Image,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { ArrowLeft, ArrowRight, BookOpen, Check, TriangleAlert, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { checkQuizAnswer, submitQuizAttempt } from './actions'
import { QuizContentDrawer } from './QuizContentDrawer'
import { emptyQuizSession, type QuizSession, saveQuizSession, useQuizSession } from './quiz-session'
import { useGroupQuizGuest } from './group-quiz'

export type QuizTourSummary = { id: string; title: string; stopCount: number }

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
  const saved = useQuizSession(tour.id)
  const restored = saved !== null
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const [, startCheck] = useTransition()
  const [drawerContent, setDrawerContent] = useState<string | null>(null)

  // Saved progress, minus answers to questions the staff removed since.
  const session = useMemo<QuizSession>(() => {
    if (!saved) return emptyQuizSession()
    const ids = new Set(questions.map((q) => q.id))
    const keep = <T,>(record: Record<string, T>) =>
      Object.fromEntries(Object.entries(record).filter(([id]) => ids.has(id)))
    return { choices: keep(saved.choices), feedback: keep(saved.feedback) }
  }, [saved, questions])

  const update = (next: QuizSession) => saveQuizSession(tour.id, next)

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

  const mapHref = withNavigationPosition(
    tourNavigationPath(lng, tour.id, from),
    search.toString(),
  ) as Route

  const answer = (questionId: string, key: string) => {
    if (session.feedback[questionId] || pendingKey) return
    setPendingKey(key)
    startCheck(async () => {
      try {
        const result = await checkQuizAnswer({ tourId: tour.id, lng, questionId, key })
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
          leaving.current = true
          saveQuizSession(tour.id, null)
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
  const backHref = groupQuiz.active ? undefined : mapHref

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
  const promptId = `quiz-prompt-${question.id}`

  return (
    <>
      {/* AppShellMain reserves room for the fixed footer below. */}
      <AppShellMain>
        <Container size="xs" px="md" pt="sm" pb="xl">
          <Stack gap="lg">
            <Box
              component="header"
              pos="sticky"
              // Sticks under the desktop top bar (≥ md, set by the frontend
              // layout); the variable is 0px on phones, so the header still
              // sticks to the very top there.
              top="var(--site-header-height, 0px)"
              py="xs"
              bg="var(--mantine-color-body)"
              style={{ zIndex: 1 }}
            >
              <Group gap="xs" wrap="nowrap">
                {backHref && (
                  <ActionIcon
                    component={Link}
                    href={backHref}
                    variant="subtle"
                    color="gray"
                    aria-label={t('Leave the quiz and return to the map')}
                    title={t('Back to the map')}
                  >
                    <ArrowLeft size={18} />
                  </ActionIcon>
                )}
                <Text fw={600} size="sm" truncate="end" flex={1}>
                  {tour.title}
                </Text>
                <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t('Question {{current}} of {{total}}', {
                    current: index + 1,
                    total: questions.length,
                  })}
                </Text>
              </Group>
              <Progress
                mt="xs"
                size="sm"
                value={(answered / questions.length) * 100}
                aria-label={t('Quiz progress')}
                // Tour identity (purple → orange) lives on the progress only.
                classNames={{ section: 'bg-linear-to-r from-purple-700 to-orange-400' }}
              />
            </Box>

            {question.image && (
              <AspectRatio ratio={16 / 9}>
                <Image src={question.image.url} alt={question.image.alt} radius="md" fit="cover" />
              </AspectRatio>
            )}

            <Title order={2} size="h3" id={promptId} style={{ textWrap: 'balance' }}>
              {question.prompt}
            </Title>

            <Stack gap="sm" role="group" aria-labelledby={promptId}>
              {question.options.map((option) => (
                <AnswerButton
                  key={option.key}
                  state={
                    !feedback
                      ? pendingKey === option.key
                        ? 'pending'
                        : pendingKey
                          ? 'locked'
                          : 'idle'
                      : option.key === feedback.correctKey
                        ? 'correct'
                        : option.key === chosen
                          ? 'wrong'
                          : 'other'
                  }
                  onClick={() => answer(question.id, option.key)}
                >
                  {option.text}
                </AnswerButton>
              ))}
            </Stack>

            <div aria-live="polite">
              {feedback && (
                <Paper withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Text fw={700} c={feedback.correct ? 'green.8' : 'red.8'}>
                      {feedback.correct ? t('Correct!') : t('Not quite.')}
                      {!feedback.correct && (
                        <VisuallyHidden>
                          {' '}
                          {t('The correct answer is {{answer}}.', {
                            answer: question.options.find((o) => o.key === feedback.correctKey)
                              ?.text,
                          })}
                        </VisuallyHidden>
                      )}
                    </Text>
                    {feedback.explanation && <Text>{feedback.explanation}</Text>}
                    {question.contentIds.length > 0 && (
                      <Group gap="xs">
                        {question.contentIds.map((contentId, i) => (
                          <Button
                            key={contentId}
                            variant="subtle"
                            size="compact-sm"
                            leftSection={<BookOpen size={16} />}
                            onClick={() => setDrawerContent(contentId)}
                          >
                            {question.contentIds.length > 1
                              ? t('Read content {{n}} again', { n: i + 1 })
                              : t('Read the content again')}
                          </Button>
                        ))}
                      </Group>
                    )}
                  </Stack>
                </Paper>
              )}
            </div>
          </Stack>
        </Container>
      </AppShellMain>

      <AppShellFooter p="xs">
        <Container size="xs" px="md">
          {isLast ? (
            <Button
              fullWidth
              size="md"
              disabled={!feedback}
              loading={submitting}
              rightSection={<ArrowRight size={18} />}
              onClick={submit}
            >
              {t('See your results')}
            </Button>
          ) : (
            <Button
              fullWidth
              size="md"
              disabled={!feedback}
              rightSection={<ArrowRight size={18} />}
              onClick={() => goTo(index + 2)}
            >
              {t('Next question')}
            </Button>
          )}
        </Container>
      </AppShellFooter>

      <QuizContentDrawer
        contentId={drawerContent}
        lng={lng}
        onClose={() => setDrawerContent(null)}
      />
    </>
  )
}

type AnswerState = 'idle' | 'pending' | 'locked' | 'correct' | 'wrong' | 'other'

/**
 * One large, wrapping answer button. After answering, meaning is carried by
 * color + icon + label together (DESIGN.md Triplet Rule), never color alone.
 * Answered buttons stay readable (not grayed out) and are only aria-disabled.
 */
function AnswerButton({
  state,
  onClick,
  children,
}: {
  state: AnswerState
  onClick: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation('tour-quiz')
  const look: Record<AnswerState, ButtonProps> = {
    idle: { variant: 'default' },
    pending: { variant: 'default', loading: true },
    locked: { variant: 'default' },
    correct: {
      variant: 'light',
      color: 'green',
      rightSection: (
        <Group gap={4} wrap="nowrap">
          <Check size={18} aria-hidden />
          <Text size="sm" fw={600} span>
            {t('Right answer')}
          </Text>
        </Group>
      ),
    },
    wrong: {
      variant: 'light',
      color: 'red',
      rightSection: (
        <Group gap={4} wrap="nowrap">
          <X size={18} aria-hidden />
          <Text size="sm" fw={600} span>
            {t('Your answer')}
          </Text>
        </Group>
      ),
    },
    other: { variant: 'default', c: 'dimmed' },
  }
  const inert = state !== 'idle'
  return (
    <Button
      {...look[state]}
      size="lg"
      fullWidth
      justify="space-between"
      h="auto"
      mih={56}
      py="sm"
      radius="md"
      aria-disabled={inert || undefined}
      onClick={inert ? undefined : onClick}
      styles={{
        label: { whiteSpace: 'normal', textAlign: 'start', lineHeight: 1.35, fontWeight: 500 },
      }}
    >
      {children}
    </Button>
  )
}

/** Sets expectations (length, unvisited stops) and offers resume/restart for a quiz in progress. */
function QuizIntro({
  tour,
  questionCount,
  unvisited,
  answered,
  mapHref,
  onStart,
  onRestart,
}: {
  tour: QuizTourSummary
  questionCount: number
  unvisited: number
  answered: number
  /** Missing for group guests, who return to the map with the host. */
  mapHref?: Route
  onStart: () => void
  onRestart: () => void
}) {
  const { t } = useTranslation('tour-quiz')
  // About 30 seconds per question, never shown as zero.
  const minutes = Math.max(1, Math.round(questionCount / 2))
  const inProgress = answered > 0
  return (
    <AppShellMain>
      <Container size="xs" px="md" py="xl">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1} size="h2" style={{ textWrap: 'balance' }}>
              {tour.title}
            </Title>
            <Text c="dimmed">
              {t('Final quiz · {{count}} questions · about {{minutes}} min', {
                count: questionCount,
                minutes,
              })}
            </Text>
          </Stack>

          <Text>
            {t(
              'Each question has four answers and only one is right. You see straight away whether you got it, with a short explanation.',
            )}
          </Text>

          {unvisited > 0 && (
            <Alert
              color="orange"
              icon={<TriangleAlert size={18} />}
              title={t('You have not seen every stop yet')}
            >
              {t(
                '{{unvisited}} of {{total}} stops are still ahead of you. Some questions may be about them.',
                {
                  unvisited,
                  total: tour.stopCount,
                },
              )}
            </Alert>
          )}

          <Stack gap="sm">
            <Button size="md" onClick={onStart} rightSection={<ArrowRight size={18} />}>
              {inProgress
                ? t('Resume at question {{n}}', { n: Math.min(answered + 1, questionCount) })
                : t('Start the quiz')}
            </Button>
            {inProgress && (
              <Button size="md" variant="default" onClick={onRestart}>
                {t('Start over')}
              </Button>
            )}
            {mapHref && (
              <Button
                size="md"
                variant="subtle"
                component={Link}
                href={mapHref}
                leftSection={<ArrowLeft size={18} />}
              >
                {t('Back to the tour')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </AppShellMain>
  )
}
