import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import { serverComponentStory } from '@/mocks/server-component'
import { mockTourMinimal, mockToursList } from '@/mocks/tour.mock'

import { ToursSearchResults } from './ToursSearchResults'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ToursSearchResultsStory = serverComponentStory(ToursSearchResults)

const meta = {
  title: 'Search/Tours Results',
  ...ToursSearchResultsStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ToursSearchResultsStory.component>

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
