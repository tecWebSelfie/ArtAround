import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Suspense, use } from 'react'
import { expect, userEvent, within } from 'storybook/test'

import NavigatorHomePage from './page'

// Storybook renders stories with the Vite client runtime, which cannot render
// async Server Components directly. This sync wrapper unwraps the server
// component promise via React.use() so the stories render.
// page.tsx itself stays an async Server Component for the App Router.
function NavigatorHomePageForStorybook() {
  return use(NavigatorHomePage())
}

const meta = {
  title: 'Frontend/Navigator/NavigatorPage',
  component: NavigatorHomePageForStorybook,
  render: () => (
    <Suspense fallback={null}>
      <NavigatorHomePageForStorybook />
    </Suspense>
  ),
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavigatorHomePageForStorybook>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SearchFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Everything's")).toBeVisible()
    await expect(canvas.getByText('Scan tour QR to start')).toBeVisible()
    await expect(
      canvas.getByText('Or turn the mic on and tell us what you want'),
    ).toBeVisible()

    // Reflection renders an aria-hidden duplicate of the autocomplete below the
    // real one; the first match in DOM order is the interactive input.
    const search = canvas.getAllByPlaceholderText('Look for the next tour')[0]
    await userEvent.click(search)
    await userEvent.type(search, 'street art')
    await expect(search).toHaveValue('street art')
  },
}
