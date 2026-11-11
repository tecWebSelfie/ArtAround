import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect, userEvent, within } from 'storybook/test'

import NavigatorHomePage from './NavigatorPage'

const meta = {
  title: 'Frontend/Navigator/NavigatorPage',
  component: NavigatorHomePage,
  args: {
    lng: 'en',
  },
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavigatorHomePage>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SearchFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The title names the task; its accented phrase echoes the app's name.
    await expect(
      canvas.getByRole('heading', { level: 1, name: /find your way around art/i }),
    ).toBeVisible()
    await expect(canvas.getByText('Scan a tour QR code to start')).toBeVisible()
    // The plan caption reads "Or plan a visit…" on phones and "Plan a visit…"
    // from md (the other is display:none), so check the card by its accessible
    // name, which is always the visible caption, at any viewport.
    await expect(
      canvas.getByRole('link', { name: /plan a visit around your time and interests/i }),
    ).toBeVisible()

    // One search field, and it is the combobox target itself: it carries
    // the popup state screen readers announce (no hidden duplicate).
    const search = canvas.getByPlaceholderText('Search tours, museums, cities')
    await expect(search).toHaveAttribute('aria-haspopup', 'listbox')
    await userEvent.click(search)
    await userEvent.type(search, 'street art')
    await expect(search).toHaveValue('street art')
  },
}
