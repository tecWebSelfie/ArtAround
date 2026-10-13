import { mockTourFull } from '@/mocks/tour.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { use } from 'react'
import NavigationPage from './NavigationStartPage'

// With experimentalRSC, Storybook wraps the story in Suspense automatically.
// This sync wrapper calls the async Server Component as a plain function
// and unwraps the resulting promise via React.use().
// NavigationPage.tsx itself stays an async Server Component for the App Router.
function NavigationPageForStorybook({
  tour,
  ...props
}: React.ComponentProps<typeof NavigationPage>) {
  return use(NavigationPage({ tour, ...props }))
}

const meta = {
  title: 'Frontend/Navigator/TourNavigatorHome',
  component: NavigationPageForStorybook,
  args: {
    className: 'h-dvh',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NavigationPageForStorybook>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    tour: mockTourFull,
  },
}
