import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { QrScanPage } from './QrScanPage'

const meta = {
  title: 'Tour/Navigation/Scan/QrScanPage',
  component: QrScanPage,
} satisfies Meta<typeof QrScanPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
