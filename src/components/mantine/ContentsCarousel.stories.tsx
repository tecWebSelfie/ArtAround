import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { use } from 'react'
import { expect } from 'storybook/test'

import { mockContentMinimal, mockContentsList } from '@/mocks/content.mock'
import type { User } from '@/payload-types'

import { ContentsCarousel } from './ContentsCarousel'

// With experimentalRSC, Storybook wraps the story in Suspense automatically.
// This sync wrapper unwraps the async Server Component promise via React.use().
// ContentsCarousel.tsx itself stays an async Server Component for the App Router.
function ContentsCarouselForStorybook({ contents }: { contents: User['authoredContents'] }) {
  return use(ContentsCarousel({ contents }))
}

const meta = {
  title: 'Contents Carousel',
  component: ContentsCarouselForStorybook,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ContentsCarouselForStorybook>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  args: {
    contents: mockContentsList,
  },
  play: async ({ canvas }) => {
    // Regression guard: populated contents must render as carousel slides
    await expect(canvas.findByText('Storia della ceramica attica')).resolves.toBeTruthy()
    await expect(canvas.findByText('Il restauro del bronzo')).resolves.toBeTruthy()
    await expect(canvas.findByText('Leggere un dipinto rinascimentale')).resolves.toBeTruthy()
    // Cards expose difficulty and reading time, not just the title
    await expect(canvas.findByText('Easy')).resolves.toBeTruthy()
    await expect(canvas.findByText('3 min read')).resolves.toBeTruthy()
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
    await expect(canvas.findByText('No contents available')).resolves.toBeTruthy()
  },
}

export const Unpopulated: Story = {
  args: {
    contents: ['content-1', 'content-2'],
  },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: nothing to show, empty state instead of a crash
    await expect(canvas.findByText('No contents available')).resolves.toBeTruthy()
  },
}
