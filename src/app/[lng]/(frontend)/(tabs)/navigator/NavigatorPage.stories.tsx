import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect, userEvent, within } from 'storybook/test'

import NavigatorHomePage from './NavigatorPage'

const meta = {
  title: 'Frontend/Navigator/NavigatorPage',
  component: NavigatorHomePage,
  parameters: {
    layout: 'fullscreen',
    // The hero word keeps cycling (TypeWriterText) and the search border keeps
    // animating, so no two screenshots match.
    visual: { disable: true },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavigatorHomePage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SearchFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Everything's")).toBeVisible()
    await expect(canvas.getByText('Scan tour QR to start')).toBeVisible()
    await expect(canvas.getByText('Or plan a visit around your time and interests')).toBeVisible()

    // Reflection renders an aria-hidden duplicate of the autocomplete below the
    // real one; the first match in DOM order is the interactive input.
    const search = canvas.getAllByPlaceholderText('Look for the next tour')[0]
    await userEvent.click(search)
    await userEvent.type(search, 'street art')
    await expect(search).toHaveValue('street art')
  },
}
