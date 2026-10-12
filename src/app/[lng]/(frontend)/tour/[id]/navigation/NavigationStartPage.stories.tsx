import { mockTourFull } from '@/mocks/tour.mock'
import { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Suspense, use } from 'react'
import NavigationPage from './NavigationStartPage'

// Storybook renders stories with the Vite client runtime, which has no React
// Server Components: an async component would be an illegal async Client
// Component. This sync wrapper calls the server component as a plain function
// and unwraps the resulting promise via React.use(), so the story renders.
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
  render: (args) => (
    <Suspense fallback={null}>
      <NavigationPageForStorybook {...args} className="h-dvh" />
    </Suspense>
  ),
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
