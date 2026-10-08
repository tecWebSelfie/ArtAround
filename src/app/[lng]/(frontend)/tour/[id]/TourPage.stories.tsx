import { mockContentMinimal, mockContentSecond } from '@/mocks/content.mock'
import { mockUserCurator } from '@/mocks/user.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
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
}
