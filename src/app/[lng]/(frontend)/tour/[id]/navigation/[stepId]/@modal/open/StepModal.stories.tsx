import { mockContentSecond } from '@/mocks/content.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StepModal } from './StepModal'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, userEvent } from 'storybook/test'
import { tourNavigationPath } from '@/lib/tour-navigation'

const meta = {
  title: 'Components/StepModalContent',
  component: StepModal,
  parameters: { nextjs: { appDirectory: true } },
} satisfies Meta<typeof StepModal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    step: mockContentSecond,
  },
}

export const NextStep: Story = {
  args: { step: mockContentSecond, nextHref: tourNavigationPath('en', 'demo', 2) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Go to next step' }))
    await expect(getRouter().replace).toHaveBeenCalledWith('/en/tour/demo/navigation/2')
  },
}

export const LastStep: Story = {
  args: { step: mockContentSecond, nextHref: tourNavigationPath('en', 'demo', 3), lastStep: true },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Complete tour' }))
    await expect(getRouter().replace).toHaveBeenCalledWith('/en/tour/demo/navigation/3')
  },
}

/** With a quiz, the last stop's action opens it, passing the completed cursor as `from`. */
export const LastStepWithQuiz: Story = {
  args: {
    step: mockContentSecond,
    nextHref: tourNavigationPath('en', 'demo', 3),
    lastStep: true,
    quizFrom: 3,
  },
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
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Complete and go to the quiz' }))
    await expect(getRouter().push).toHaveBeenCalledWith('/en/tour/demo/quiz?from=3')
  },
}
