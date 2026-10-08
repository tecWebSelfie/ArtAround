import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect } from 'storybook/test'

import { mockContentMinimal, mockContentsList } from '@/mocks/content.mock'

import { ContentsSearchResults } from './ContentsSearchResults'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// ContentsSearchResults.tsx itself stays an async Server Component for the App Router.
function ContentsSearchResultsForStorybook({
  contents,
}: {
  contents: (string | (typeof mockContentsList)[number])[] | null | undefined
}) {
  return use(ContentsSearchResults({ contents }))
}

const meta = {
  title: 'Search/Contents Results',
  component: ContentsSearchResultsForStorybook,
  render: (args) => (
    <Suspense fallback={null}>
      <ContentsSearchResultsForStorybook {...args} />
    </Suspense>
  ),
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContentsSearchResultsForStorybook>

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
