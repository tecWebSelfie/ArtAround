'use client'

import { payloadSdk } from '@/payload-sdk'
import { ActionIcon, Button, Group, Paper, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * The end-of-tour quiz, written in the tour editor (`TourForm`) by the
 * tour's author — e.g. a teacher preparing a class visit. Questions written
 * here belong to the tour (`quizQuestions.relatedTo` empty, see
 * `src/lib/quiz-ownership.ts`): removing one from the quiz deletes it, and
 * they go with the tour. Questions linked to contents, written in the admin,
 * are kept untouched in their places (`KeptQuestion`, `saveQuizQuestions`).
 */

/** One question as the form edits it; `id` once it has been saved. */
export type QuizDraft = {
  id?: string
  prompt: string
  correctAnswer: string
  wrongAnswers: [string, string, string]
  explanation: string
}

export const emptyQuizDraft = (): QuizDraft => ({
  prompt: '',
  correctAnswer: '',
  wrongAnswers: ['', '', ''],
  explanation: '',
})

/**
 * Form validation of `quiz`: every question needs its text and four answers.
 * `message` comes translated from the form (the extractor files a key under
 * the namespace of the `t` that reads it).
 */
export const validateQuiz =
  (message: string) =>
  (quiz: QuizDraft[]): string | null =>
    quiz.every(
      (question) =>
        question.prompt.trim() &&
        question.correctAnswer.trim() &&
        question.wrongAnswers.every((answer) => answer.trim()),
    )
      ? null
      : message

/**
 * A quiz question the editor doesn't show (linked to contents, written in the
 * admin): `after` lists the questions before it in the stored quiz, nearest
 * first; `contents` the contents it concerns (`null` when unreadable here, then
 * always kept).
 */
export type KeptQuestion = { id: string; after: string[]; contents: string[] | null }

const questionData = (question: QuizDraft) => ({
  prompt: question.prompt.trim(),
  correctAnswer: question.correctAnswer.trim(),
  wrongAnswers: question.wrongAnswers.map((text) => ({ text: text.trim() })),
  explanation: question.explanation.trim() || null,
})

/**
 * Creates the new questions and updates the existing ones, returning the ids
 * the tour's `quiz.questions` should list. Kept content questions go back
 * right after the nearest question that preceded them and is still listed
 * (or first), minus those whose
 * contents all left the tour (the tour's validation would refuse them, and
 * the editor can't remove them).
 * Runs before the tour is saved, since the tour validates the ids it lists;
 * if the tour save then fails, `discard` deletes the questions created here
 * and writes back `saved` (the stored drafts) over the updated ones.
 */
export async function saveQuizQuestions({
  quiz,
  saved,
  kept,
  stops,
}: {
  quiz: QuizDraft[]
  saved: QuizDraft[]
  kept: KeptQuestion[]
  stops: string[]
}) {
  const savedById = new Map(saved.flatMap((draft) => (draft.id ? [[draft.id, draft]] : [])))
  const updated: QuizDraft[] = []
  const created: string[] = []
  // Every existing question is written, changed or not: the form may come
  // back from a sessionStorage draft, so `saved` can't tell what changed.
  const results = await Promise.allSettled(
    quiz.map(async (question) => {
      const data = questionData(question)
      if (!question.id) {
        // The collection's default, made explicit for the typed SDK.
        const doc = await payloadSdk.create({
          collection: 'quizQuestions',
          data: { ...data, difficulty: 'medium' },
        })
        created.push(doc.id)
        return doc.id
      }
      await payloadSdk.update({ collection: 'quizQuestions', id: question.id, data })
      const before = savedById.get(question.id)
      if (before) updated.push(before)
      return question.id
    }),
  )
  const discard = () =>
    Promise.allSettled([
      ...created.map((id) => payloadSdk.delete({ collection: 'quizQuestions', id })),
      ...updated.map((draft) =>
        payloadSdk.update({
          collection: 'quizQuestions',
          id: draft.id!,
          data: questionData(draft),
        }),
      ),
    ])
  const questions: string[] = []
  for (const result of results) {
    if (result.status === 'rejected') {
      await discard()
      throw result.reason
    }
    questions.push(result.value)
  }
  // In stored order, so a kept question that followed another kept one
  // finds it already in place.
  const stopSet = new Set(stops)
  for (const question of kept) {
    if (question.contents && !question.contents.some((content) => stopSet.has(content))) continue
    const anchor = question.after.find((id) => questions.includes(id))
    questions.splice(anchor ? questions.indexOf(anchor) + 1 : 0, 0, question.id)
  }
  return { questions, discard }
}

export function QuizEditor({
  value: quiz,
  onChange: setQuiz,
  error,
}: {
  value: QuizDraft[]
  onChange: (quiz: QuizDraft[]) => void
  error?: ReactNode
}) {
  const { t } = useTranslation('editing')
  const update = (index: number, change: Partial<QuizDraft>) =>
    setQuiz(quiz.map((question, i) => (i === index ? { ...question, ...change } : question)))

  return (
    <Stack gap="xs">
      <Text fw={600}>{t('Quiz')}</Text>
      <Text size="sm" c="dimmed">
        {t(
          'Optional: multiple-choice questions visitors answer after the last stop. A group host can show everyone’s score.',
        )}
      </Text>
      {quiz.map((question, index) => (
        <Paper key={question.id ?? `new-${index}`} withBorder radius="md" p="sm">
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={600}>
                {t('Question {{number}}', { number: index + 1 })}
              </Text>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t('Remove question {{number}}', { number: index + 1 })}
                onClick={() => setQuiz(quiz.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Group>
            <Textarea
              label={t('Question')}
              required
              autosize
              minRows={2}
              maxLength={500}
              value={question.prompt}
              onChange={(event) => update(index, { prompt: event.currentTarget.value })}
            />
            <TextInput
              label={t('Correct answer')}
              required
              maxLength={200}
              value={question.correctAnswer}
              onChange={(event) => update(index, { correctAnswer: event.currentTarget.value })}
            />
            {question.wrongAnswers.map((answer, answerIndex) => (
              <TextInput
                key={answerIndex}
                label={t('Wrong answer {{number}}', { number: answerIndex + 1 })}
                required
                maxLength={200}
                value={answer}
                onChange={(event) => {
                  const wrongAnswers = [...question.wrongAnswers] as QuizDraft['wrongAnswers']
                  wrongAnswers[answerIndex] = event.currentTarget.value
                  update(index, { wrongAnswers })
                }}
              />
            ))}
            <Textarea
              label={t('Explanation')}
              description={t('Optional: shown after the visitor answers.')}
              autosize
              minRows={1}
              maxLength={1000}
              value={question.explanation}
              onChange={(event) => update(index, { explanation: event.currentTarget.value })}
            />
          </Stack>
        </Paper>
      ))}
      {error && (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      )}
      <Group>
        <Button
          variant="light"
          leftSection={<Plus size={16} aria-hidden />}
          onClick={() => setQuiz([...quiz, emptyQuizDraft()])}
        >
          {t('Add a question')}
        </Button>
      </Group>
    </Stack>
  )
}
