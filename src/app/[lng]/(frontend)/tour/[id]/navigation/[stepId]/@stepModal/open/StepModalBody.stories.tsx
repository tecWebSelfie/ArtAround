import { mockContentSecond } from '@/mocks/content.mock'
import { Modal } from '@mantine/core'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StepModalBody } from './StepModalBody'

const meta = {
  title: 'Components/StepModal',
  component: StepModalBody,
  decorators: [
    (renderStory, context) => {
      return (
        <Modal opened onClose={() => {}}>
          {renderStory(context)}
        </Modal>
      )
    },
  ],
} satisfies Meta<typeof StepModalBody>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    step: mockContentSecond,
  },
}
