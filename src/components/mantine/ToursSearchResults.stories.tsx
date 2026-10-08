import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect } from 'storybook/test'

import { mockTourMinimal, mockToursList } from '@/mocks/tour.mock'

import { ToursSearchResults } from './ToursSearchResults'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// ToursSearchResults.tsx itself stays an async Server Component for the App Router.
function ToursSearchResultsForStorybook({
  tours,
}: {
  tours: (string | (typeof mockToursList)[number])[] | null | undefined
}) {
  return use(ToursSearchResults({ tours }))
}

const meta = {
  title: 'Search/Tours Results',
  component: ToursSearchResultsForStorybook,
  render: (args) => (
    <Suspense fallback={null}>
      <ToursSearchResultsForStorybook {...args} />
    </Suspense>
  ),
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ToursSearchResultsForStorybook>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  args: {
    tours: mockToursList,
  },
  play: async ({ canvas }) => {
    // Regression guard: populated tours must render as result cards.
    // All mock tours share the same title, so expect all three cards.
    await expect(
      canvas.findAllByText('La monnalisa e i suoi misteri'),
    ).resolves.toHaveLength(3)
  },
}

export const Single: Story = {
  args: {
    tours: [mockTourMinimal],
  },
}

export const Empty: Story = {
  args: {
    tours: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('No visits found')).resolves.toBeTruthy()
  },
}

export const Unpopulated: Story = {
  args: {
    tours: ['tour-1', 'tour-2'],
  },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: nothing to show, empty state instead of a crash
    await expect(canvas.findByText('No visits found')).resolves.toBeTruthy()
  },
}
