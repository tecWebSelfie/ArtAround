import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { QrScanPage } from './QrScanPage'

const meta = {
  title: 'Tour/Navigation/Scan/QrScanPage',
  // A live camera feed can't be screenshotted deterministically.
  parameters: { visual: { disable: true } },
  component: QrScanPage,
} satisfies Meta<typeof QrScanPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
