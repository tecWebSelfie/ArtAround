import { mockTourWithContents } from '@/mocks/tour.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import TourPage from './TourPage'

const meta = {
  title: 'Frontend/Tour/TourPage',
  component: TourPage,
  args: {
    tour: mockTourWithContents,
  },
} satisfies Meta<typeof TourPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.findByText(mockTourWithContents.title)).resolves.toBeTruthy()
    // One content card per timeline item, each with a no-op "See more" button
    await expect(canvas.findAllByText('See more')).resolves.toHaveLength(3)
    // One control combo per timeline item
    await expect(canvas.findAllByText('Difficulty')).resolves.toHaveLength(3)
    await expect(canvas.findAllByText('Language')).resolves.toHaveLength(3)
  },
}
