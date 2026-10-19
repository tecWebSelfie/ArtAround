import { mockTourFull } from '@/mocks/tour.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import NavigationPage from './NavigationStartPage'
import { serverComponentStory } from '@/mocks/server-component'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const NavigationPageStory = serverComponentStory(NavigationPage)

const meta = {
  title: 'Frontend/Navigator/TourNavigatorHome',
  ...NavigationPageStory,
  args: {
    className: 'h-dvh',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NavigationPageStory.component>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    tour: mockTourFull,
  },
}
