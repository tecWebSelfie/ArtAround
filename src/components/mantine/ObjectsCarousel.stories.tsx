import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect } from 'storybook/test'

import { mockObjectAmphora, mockObjectsList } from '@/mocks/object.mock'
import type { Museum } from '@/payload-types'

import { ObjectsCarousel } from './ObjectsCarousel'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// ObjectsCarousel.tsx itself stays an async Server Component for the App Router.
function ObjectsCarouselForStorybook({ objects }: { objects: Museum['objects'] }) {
  return use(ObjectsCarousel({ objects }))
}

const meta = {
  title: 'Objects Carousel',
  component: ObjectsCarouselForStorybook,
  render: (args) => (
    <Suspense fallback={null}>
      <ObjectsCarouselForStorybook {...args} />
    </Suspense>
  ),
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ObjectsCarouselForStorybook>

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
