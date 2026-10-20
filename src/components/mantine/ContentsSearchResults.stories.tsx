import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import { mockContentMinimal, mockContentsList } from '@/mocks/content.mock'

import { ContentsSearchResults } from './ContentsSearchResults'
import { serverComponentStory } from '@/mocks/server-component'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ContentsSearchResultsStory = serverComponentStory(ContentsSearchResults)

const meta = {
  title: 'Search/Contents Results',
  ...ContentsSearchResultsStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContentsSearchResultsStory.component>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  args: {
    contents: mockContentsList,
  },
  play: async ({ canvas }) => {
    // Regression guard: populated contents must render as result cards,
    // with difficulty and reading time alongside the title.
    await expect(canvas.findByText('Storia della ceramica attica')).resolves.toBeTruthy()
    await expect(canvas.findByText('Easy')).resolves.toBeTruthy()
    await expect(canvas.findByText('3 min read')).resolves.toBeTruthy()
    await expect(canvas.findByText('5 min read')).resolves.toBeTruthy()
  },
}

export const Single: Story = {
  args: {
    contents: [mockContentMinimal],
  },
}

export const Empty: Story = {
  args: {
    contents: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('No contents found')).resolves.toBeTruthy()
  },
}

export const Unpopulated: Story = {
  args: {
    contents: ['content-1', 'content-2'],
  },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: nothing to show, empty state instead of a crash
    await expect(canvas.findByText('No contents found')).resolves.toBeTruthy()
  },
}

// Tour picker (the tour editor's "Browse contents"): the first content is
// already a stop, the second is paid and locked, the rest can be added.
export const TourPicker: Story = {
  args: {
    contents: mockContentsList,
    picker: {
      museumId: 'museum-1',
      returnTo: '/en/tour/tour-1/edit',
      have: [mockContentsList[0]!.id],
    },
    lockedPrices: new Map([[mockContentsList[1]!.id, 499]]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('In the tour')).resolves.toBeTruthy()
    const adds = await canvas.findAllByRole('link', { name: /^Add .* to the tour$/ })
    await expect(adds).toHaveLength(mockContentsList.length - 1)
    // Picking returns to the editor with the draft restored and the stop added.
    await expect(adds[0]!.getAttribute('href')).toMatch(/^\/en\/tour\/tour-1\/edit\?draft=1&add=/)
    await expect(canvas.findByText(/4[.,]99/)).resolves.toBeTruthy()
  },
}
