import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import { mockObjectAmphora, mockObjectsList } from '@/mocks/object.mock'

import { ObjectsSearchResults } from './ObjectsSearchResults'
import { serverComponentStory } from '@/mocks/server-component'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ObjectsSearchResultsStory = serverComponentStory(ObjectsSearchResults)

const meta = {
  title: 'Search/Objects Results',
  ...ObjectsSearchResultsStory,
  args: {
    lng: 'en',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ObjectsSearchResultsStory.component>

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

// Museum picker (the map editor's "Browse the catalog"): the first object is
// already on the map, the others are placed in one click.
export const MuseumPicker: Story = {
  args: {
    objects: mockObjectsList,
    picker: { museumId: 'museum-1', returnTo: '/en/museum/museum-1/edit/mapeditor' },
    onShow: new Set([mockObjectsList[0]!.id]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('On show')).resolves.toBeTruthy()
    const places = await canvas.findAllByRole('link', { name: /^Place .* on the map$/ })
    await expect(places).toHaveLength(mockObjectsList.length - 1)
    // Picking returns to the map editor with the object in hand.
    await expect(places[0]!.getAttribute('href')).toMatch(
      /^\/en\/museum\/museum-1\/edit\/mapeditor\?place=/,
    )
  },
}
