import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { expect, userEvent, waitFor } from 'storybook/test'
import { MarketplaceSearch, type MarketplaceLabels } from './MarketplaceControls'

const labels: MarketplaceLabels = {
  searchPlaceholder: 'Search tours, contents, objects and people',
  search: 'Search',
  filters: 'Filters',
  clearFilters: 'Clear filters',
  type: 'Type',
  all: 'All',
  tours: 'Tours',
  contents: 'Contents',
  objects: 'Objects',
  users: 'People',
  usersNoPrice: "Profiles don't have a price.",
  price: 'Price',
  anyPrice: 'Any price',
  free: 'Free',
  paid: 'Paid',
}

const meta = {
  title: 'Marketplace/Controls',
  component: MarketplaceSearch,
  args: {
    basePath: '/en/marketplace',
    initialQuery: '',
    initialKind: 'all',
    initialPrice: 'all',
    labels,
  },
  parameters: { nextjs: { navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof MarketplaceSearch>

export default meta
type Story = StoryObj<typeof meta>

/** Filters expand below search, and the URL remains the source of truth. */
export const InlineFilters: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Filters' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.findByText('Type')).resolves.toBeVisible()
    await expect(canvas.findByText('Price')).resolves.toBeVisible()
  },
}

/** Submitting a draft query carries only the search state and resets pagination. */
export const SearchSubmits: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: labels.searchPlaceholder }), 'Rome')
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith('/en/marketplace?q=Rome'))
  },
}
