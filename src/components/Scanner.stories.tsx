import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { QrScanner } from './Scanner'

const meta = {
  title: 'Components/Scanner',
  component: QrScanner,
  args: {
    onScan: () => {},
    styles: {
      container: {
        position: 'fixed',
        inset: '0',
      },
    },
  },
} satisfies Meta<typeof QrScanner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
