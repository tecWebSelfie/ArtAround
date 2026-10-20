import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import {
  mockMuseumClosed,
  mockMuseumFull,
  mockMuseumMinimal,
  mockMuseumNoMedia,
  mockMuseumWithServices,
} from '@/mocks/museum.mock'
import type { Museum } from '@/payload-types'

import MuseumPage from './MuseumPage'
import { serverComponentStory } from '@/mocks/server-component'

// Async Server Component: resolved in a Storybook loader before render (see serverComponentStory).
// Flat Museum args keep one control per field in the addon panel.
// The wrapper maps them back to the component's { museum } props,
// so MuseumPage.tsx itself stays a correct App Router Server Component.
const MuseumPageStory = serverComponentStory((props: Museum) => MuseumPage({ museum: props }))

const meta = {
  title: 'Frontend/Museum/MuseumPage',
  ...MuseumPageStory,
  tags: ['autodocs'],
} satisfies Meta<typeof MuseumPageStory.component>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {
  args: { ...mockMuseumFull },
  play: async ({ canvas }) => {
    // Regression guard: museum.objects must reach the carousel populated
    await expect(canvas.findByText('Anfora a figure rosse')).resolves.toBeTruthy()
  },
}

export const Minimal: Story = {
  args: { ...mockMuseumMinimal },
}

export const NoMedia: Story = {
  args: { ...mockMuseumNoMedia },
}

export const Closed: Story = {
  args: { ...mockMuseumClosed },
}

export const WithServices: Story = {
  args: { ...mockMuseumWithServices },
}
