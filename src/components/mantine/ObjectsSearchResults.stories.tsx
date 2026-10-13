import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { use } from 'react'
import { expect } from 'storybook/test'

import { mockObjectAmphora, mockObjectsList } from '@/mocks/object.mock'

import { ObjectsSearchResults } from './ObjectsSearchResults'

// With experimentalRSC, Storybook wraps the story in Suspense automatically.
// This sync wrapper unwraps the async Server Component promise via React.use().
// ObjectsSearchResults.tsx itself stays an async Server Component for the App Router.
function ObjectsSearchResultsForStorybook({
  objects,
  lng,
}: {
  objects: (string | (typeof mockObjectsList)[number])[] | null | undefined
  lng: string
}) {
  return use(ObjectsSearchResults({ objects, lng }))
}

const meta = {
  title: 'Search/Objects Results',
  component: ObjectsSearchResultsForStorybook,
  args: {
    lng: 'en',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ObjectsSearchResultsForStorybook>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  args: {
    objects: mockObjectsList,
  },
  play: async ({ canvas }) => {
    // Regression guard: populated objects must render as result cards
    await expect(canvas.findByText('Anfora a figure rosse')).resolves.toBeTruthy()
    await expect(canvas.findByText('Mosaico pavimentale')).resolves.toBeTruthy()
  },
}

export const Single: Story = {
  args: {
    objects: [mockObjectAmphora],
  },
}

export const Empty: Story = {
  args: {
    objects: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('No objects found')).resolves.toBeTruthy()
  },
}

export const Unpopulated: Story = {
  args: {
    objects: ['object-1', 'object-2'],
  },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: nothing to show, empty state instead of a crash
    await expect(canvas.findByText('No objects found')).resolves.toBeTruthy()
  },
}
