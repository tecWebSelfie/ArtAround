import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import { mockObjectAmphora, mockObjectsList } from '@/mocks/object.mock'
import type { Museum } from '@/payload-types'

import { ObjectsCarousel } from './ObjectsCarousel'
import { serverComponentStory } from '@/mocks/server-component'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
const ObjectsCarouselStory = serverComponentStory(ObjectsCarousel)

const meta = {
  title: 'Objects Carousel',
  ...ObjectsCarouselStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ObjectsCarouselStory.component>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  args: {
    objects: mockObjectsList,
  },
  play: async ({ canvas }) => {
    // Regression guard: populated objects must render as carousel slides
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
    await expect(canvas.findByText('No objects available')).resolves.toBeTruthy()
  },
}

export const Unpopulated: Story = {
  args: {
    objects: ['object-1', 'object-2'],
  },
  play: async ({ canvas }) => {
    // String IDs are un-populated relations: nothing to show, empty state instead of a crash
    await expect(canvas.findByText('No objects available')).resolves.toBeTruthy()
  },
}
