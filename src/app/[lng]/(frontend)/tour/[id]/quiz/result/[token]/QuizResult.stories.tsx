import { AppShell } from '@mantine/core'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { QuizResult, type QuizReviewItem } from './QuizResult'

/**
 * Quiz result states: with visitor comparisons (≥ 10 attempts) and the
 * "among the first" state below the threshold. Data is static; the rating
 * widget's status request is not mocked and simply renders its idle state.
 */

const review: QuizReviewItem[] = [
  {
    id: 'q1',
    missing: false,
    prompt: 'Which technique did the painter use for the Annunciation?',
    correct: true,
    yourAnswer: 'Tempera on panel',
    correctAnswer: 'Tempera on panel',
    explanation: 'Egg tempera was the standard panel technique in 15th-century Florence.',
    contentIds: ['c1'],
    unvisited: false,
    percentCorrect: 72,
  },
  {
    id: 'q2',
    missing: false,
    prompt: 'Where was the altarpiece originally displayed?',
    correct: false,
    yourAnswer: 'In the cathedral',
    correctAnswer: 'In a convent chapel',
    explanation: 'It was commissioned for the chapel of a Dominican convent.',
    contentIds: ['c2'],
    unvisited: true,
    percentCorrect: 38,
  },
  { id: 'q3', missing: true, correct: true },
]

const meta = {
  title: 'Tour quiz/QuizResult',
  component: QuizResult,
  // The page renders its primary action in the frontend layout's AppShell footer.
  decorators: [
    (Story) => (
      <AppShell footer={{ height: 64, offset: true }}>
        <Story />
      </AppShell>
    ),
  ],
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        segments: [
          ['lng', 'en'],
          ['id', 'demo'],
        ],
      },
    },
  },
  args: {
    tour: { id: 'demo', title: 'Florence in the Renaissance' },
    score: 2,
    total: 3,
    percent: 67,
    stepsCompleted: 1,
    review,
    comparison: {
      betterThan: 62,
      bands: [
        { label: '0–20%', visitors: 3, own: false },
        { label: '21–40%', visitors: 8, own: false },
        { label: '41–60%', visitors: 14, own: false },
        { label: '61–80%', visitors: 11, own: true },
        { label: '81–100%', visitors: 6, own: false },
      ],
    },
  },
} satisfies Meta<typeof QuizResult>

export default meta
type Story = StoryObj<typeof meta>

export const WithComparison: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You did better than {{percent}}% of visitors.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Back to the navigator' })).toHaveAttribute(
      'href',
      '/en/navigator',
    )
    await expect(
      canvas.getByRole('button', { name: 'Stop not visited yet: open it' }),
    ).toBeVisible()
  },
}

export const FirstVisitors: Story = {
  args: { comparison: null },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        'You are among the first to take this quiz! Comparisons appear once more visitors have played.',
      ),
    ).toBeVisible()
  },
}
