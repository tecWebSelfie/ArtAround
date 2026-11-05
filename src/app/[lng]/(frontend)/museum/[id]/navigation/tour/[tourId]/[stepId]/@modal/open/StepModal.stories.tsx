import { mockContentSecond } from '@/mocks/content.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StepModal } from './StepModal'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, userEvent } from 'storybook/test'
import {
  contentObjectId,
  tourNavigationPath,
  tourQuizPath,
  withNavigationPosition,
} from '@/lib/tour-navigation'

const meta = {
  title: 'Components/StepModalContent',
  component: StepModal,
  parameters: { nextjs: { appDirectory: true } },
} satisfies Meta<typeof StepModal>

export default meta

type Story = StoryObj<typeof meta>

// Completing a stop confirms the visitor is standing at its object, so the
// next URL carries it as `at` (StepModal); built with the same helpers.
const at = `at=${contentObjectId(mockContentSecond)}`
const nextStepHref = tourNavigationPath('en', 'museum', 'demo', 2)
const lastStepHref = tourNavigationPath('en', 'museum', 'demo', 3)

export const Default: Story = {
  args: {
    step: mockContentSecond,
  },
}

export const NextStep: Story = {
  args: { step: mockContentSecond, nextHref: nextStepHref },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to next step' }))
    await expect(getRouter().replace).toHaveBeenCalledWith(withNavigationPosition(nextStepHref, at))
  },
}

export const LastStep: Story = {
  args: { step: mockContentSecond, nextHref: lastStepHref, lastStep: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Complete tour' }))
    await expect(getRouter().replace).toHaveBeenCalledWith(withNavigationPosition(lastStepHref, at))
  },
}

/** With a quiz, the last stop's action opens it, passing the completed cursor as `from`. */
export const LastStepWithQuiz: Story = {
  args: {
    step: mockContentSecond,
    nextHref: lastStepHref,
    lastStep: true,
    quizFrom: 3,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        segments: [
          ['lng', 'en'],
          ['id', 'museum'],
          ['tourId', 'demo'],
        ],
      },
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Complete and go to the quiz' }))
    await expect(getRouter().push).toHaveBeenCalledWith(tourQuizPath('en', 'demo', 3, at))
  },
}
