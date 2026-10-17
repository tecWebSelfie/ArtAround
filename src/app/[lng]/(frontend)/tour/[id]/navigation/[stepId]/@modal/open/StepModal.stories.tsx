import { mockContentSecond } from '@/mocks/content.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StepModal } from './StepModal'

const meta = {
  title: 'Components/StepModalContent',
  component: StepModal,
} satisfies Meta<typeof StepModal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    step: mockContentSecond,
  },
}
