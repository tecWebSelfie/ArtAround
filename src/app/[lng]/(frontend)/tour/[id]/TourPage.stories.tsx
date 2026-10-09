import { mockContentMinimal, mockContentSecond } from '@/mocks/content.mock'
import { mockUserCurator } from '@/mocks/user.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import TourPage from './TourPage'

const meta: Meta<typeof TourPage> = {
  title: 'Frontend/Tour/TourPage',
  component: TourPage,
  args: {
    title: 'Sample Tour Title',
    author: {
      totalDocs: 1,
      hasNextPage: false,
      docs: [mockUserCurator],
    },
    contents: [mockContentMinimal, mockContentSecond],
  },
} satisfies Meta<typeof TourPage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Sample Tour Title',
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Sample Tour Title')).resolves.toBeTruthy()
    // One content card per timeline item, each with a no-op "See more" button
    await expect(canvas.findAllByText('See more')).resolves.toHaveLength(2)
    // One control combo per timeline item
    await expect(canvas.findAllByText('Difficulty')).resolves.toHaveLength(2)
    await expect(canvas.findAllByText('Language')).resolves.toHaveLength(2)
  },
}
