import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { use } from 'react'
import { expect } from 'storybook/test'

import { mockTourMinimal, mockToursList } from '@/mocks/tour.mock'

import { ToursSearchResults } from './ToursSearchResults'

// With experimentalRSC, Storybook wraps the story in Suspense automatically.
// This sync wrapper unwraps the async Server Component promise via React.use().
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
    // Each mock tour has a distinct title, so expect one card per tour.
    await expect(canvas.findByText('La Monna Lisa e i suoi misteri')).resolves.toBeTruthy()
    await expect(canvas.findByText('I segreti del Colosseo')).resolves.toBeTruthy()
    await expect(canvas.findByText('Mosaici e geometrie antiche')).resolves.toBeTruthy()
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
