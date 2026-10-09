import { mockContentSecond } from '@/mocks/content.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ContentDetailsModal } from './ContentDetailsModal'

const meta = {
  title: 'Components/ContentDetailsModal',
  component: ContentDetailsModal,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContentDetailsModal>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    opened: true,
    onClose: () => {},
    content: mockContentSecond,
  },
}
