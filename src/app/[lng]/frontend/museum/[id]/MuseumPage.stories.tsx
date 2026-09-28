import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'

import type { Museum } from '@/payload-types'
import {
  mockMuseumClosed,
  mockMuseumFull,
  mockMuseumMinimal,
  mockMuseumNoMedia,
  mockMuseumWithServices,
} from '@/mocks/museum.mock'

import MuseumPage from './MuseumPage'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
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
  render: (args) => (
    <Suspense fallback={null}>
      <MuseumPageForStorybook {...args} />
    </Suspense>
  ),
  tags: ['autodocs'],
} satisfies Meta<typeof MuseumPageForStorybook>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {
  args: { ...mockMuseumFull },
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
