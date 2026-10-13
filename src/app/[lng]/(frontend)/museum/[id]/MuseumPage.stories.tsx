import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { use } from 'react'
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

// With experimentalRSC, Storybook wraps the story in Suspense automatically.
// This sync wrapper unwraps the async Server Component promise via React.use().
// MuseumPage.tsx itself stays an async Server Component for the App Router.
// Flat Museum args keep one control per field in the addon panel.
// The wrapper maps them back to the component's { museum } props,
// so MuseumPage.tsx itself stays a correct App Router Server Component.
function MuseumPageForStorybook(props: Museum) {
  return use(MuseumPage({ museum: props }))
}

const meta = {
  title: 'Frontend/Museum/MuseumPage',
  component: MuseumPageForStorybook,
  tags: ['autodocs'],
} satisfies Meta<typeof MuseumPageForStorybook>

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
