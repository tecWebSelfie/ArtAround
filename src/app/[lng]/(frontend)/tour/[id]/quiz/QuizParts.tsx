'use client'

import type { QuizQuestionView } from '@/lib/quiz-core'
import {
  ActionIcon,
  Alert,
  AppShellMain,
  AspectRatio,
  Box,
  Button,
  Container,
  Group,
  Image,
  List,
  ListItem,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
  type ButtonProps,
  VisuallyHidden,
} from '@mantine/core'
import { ArrowLeft, ArrowRight, BookOpen, Check, ListChecks, TriangleAlert, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { type QuizFeedback } from './quiz-session'

import type { QuizTourSummary } from './TourQuiz'

/** The quiz page's parts (`TourQuiz.tsx`): intro, header, answers and feedback. */

type AnswerState = 'idle' | 'pending' | 'locked' | 'correct' | 'wrong' | 'other'

/**
 * One option's state. Before the feedback: the one being sent, the others
 * locked meanwhile. After it: the right answer, the visitor's wrong one, and
 * the rest.
 */
export function answerState(
  key: string,
  {
    feedback,
    chosen,
    pendingKey,
  }: { feedback?: QuizFeedback; chosen?: string; pendingKey: string | null },
): AnswerState {
  if (feedback) {
    if (key === feedback.correctKey) return 'correct'
    return key === chosen ? 'wrong' : 'other'
  }
  if (pendingKey === key) return 'pending'
  return pendingKey ? 'locked' : 'idle'
}

/**
 * One large, wrapping answer button. After answering, meaning is carried by
 * color + icon + label together (DESIGN.md Triplet Rule), never color alone.
 * Answered buttons stay readable (not grayed out) and are only aria-disabled.
 */
export function AnswerButton({
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
export function QuizIntro({
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
            {/* The quiz mark (DESIGN.md: grape, as on the tour's "Ends with a
                quiz" badge), so the screen reads as the tour's last step. */}
            <ThemeIcon variant="light" color="grape" size="xl" radius="xl" mb="xs" aria-hidden>
              <ListChecks size={22} />
            </ThemeIcon>
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

          {/* How it works, as three short facts instead of one paragraph. */}
          <List spacing="xs" size="sm" icon={<Check size={16} aria-hidden />} center>
            <ListItem>{t('Four answers per question, only one is right.')}</ListItem>
            <ListItem>
              {t('You see straight away whether you got it, with a short explanation.')}
            </ListItem>
            <ListItem>{t('At the end, your score and a link to share it.')}</ListItem>
          </List>

          {unvisited > 0 && (
            <Alert
              // Yellow, not orange: orange means "paid" in this app.
              color="yellow"
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

/**
 * The quiz's sticky header: the way back to the map (not for group guests),
 * the tour, which question this is, and the progress. It sticks under the
 * desktop top bar (≥ md, set by the frontend layout); the variable is 0px on
 * phones, so the header still sticks to the very top there.
 */
export function QuizHeader({
  title,
  backHref,
  index,
  total,
  answered,
}: {
  title: string
  backHref: Route | undefined
  index: number
  total: number
  answered: number
}) {
  const { t } = useTranslation('tour-quiz')
  return (
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
          {title}
        </Text>
        <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {t('Question {{current}} of {{total}}', {
            current: index + 1,
            total,
          })}
        </Text>
      </Group>
      <Progress
        mt="xs"
        size="sm"
        value={(answered / total) * 100}
        aria-label={t('Quiz progress')}
        // Tour identity (purple → orange) lives on the progress only.
        classNames={{ section: 'bg-tour' }}
      />
    </Box>
  )
}

/**
 * Whether the answer was right (the right one read out to screen readers
 * when it wasn't), the explanation, and the contents to read again.
 */
export function AnswerFeedback({
  feedback,
  question,
  onReadContent,
}: {
  feedback: QuizFeedback
  question: QuizQuestionView
  onReadContent: (contentId: string) => void
}) {
  const { t } = useTranslation('tour-quiz')
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="xs">
        <Text fw={700} c={feedback.correct ? 'green.8' : 'red.8'}>
          {feedback.correct ? t('Correct!') : t('Not quite.')}
          {!feedback.correct && (
            <VisuallyHidden>
              {' '}
              {t('The correct answer is {{answer}}.', {
                answer: question.options.find((o) => o.key === feedback.correctKey)?.text,
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
                onClick={() => onReadContent(contentId)}
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
  )
}

/**
 * One question: its picture, the prompt, the answers (a labelled group) and,
 * once answered, the feedback, announced politely.
 */
export function QuizQuestion({
  question,
  feedback,
  stateOf,
  onAnswer,
  onReadContent,
}: {
  question: QuizQuestionView
  feedback: QuizFeedback | undefined
  stateOf: (key: string) => AnswerState
  onAnswer: (key: string) => void
  onReadContent: (contentId: string) => void
}) {
  const promptId = `quiz-prompt-${question.id}`
  return (
    <>
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
            state={stateOf(option.key)}
            onClick={() => onAnswer(option.key)}
          >
            {option.text}
          </AnswerButton>
        ))}
      </Stack>

      <div aria-live="polite">
        {feedback && (
          <AnswerFeedback feedback={feedback} question={question} onReadContent={onReadContent} />
        )}
      </div>
    </>
  )
}
