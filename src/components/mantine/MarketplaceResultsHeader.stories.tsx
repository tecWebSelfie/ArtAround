import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import type { Route } from 'next'
import { MarketplaceResultsHeader } from './MarketplaceResultsHeader'

const meta = {
  title: 'Marketplace/ResultsHeader',
  component: MarketplaceResultsHeader,
  args: {
    resultsLabel: '30 results',
    clearHref: '/en/marketplace' as Route,
    clearLabel: 'Clear filters',
    filters: [
      {
        id: 'kind',
        label: 'Tours',
        removeLabel: 'Remove filter: Tours',
        href: '/en/marketplace?q=Rome&price=paid' as Route,
      },
      {
        id: 'price',
        label: 'Paid',
        removeLabel: 'Remove filter: Paid',
        href: '/en/marketplace?q=Rome&kind=tours' as Route,
      },
    ],
  },
  parameters: { nextjs: { navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof MarketplaceResultsHeader>

export default meta
type Story = StoryObj<typeof meta>

/** The result count names the section and each active filter can be removed on its own. */
export const WithActiveFilters: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: '30 results' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Remove filter: Tours' })).toHaveAttribute(
      'href',
      '/en/marketplace?q=Rome&price=paid',
    )
    await expect(canvas.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
      'href',
      '/en/marketplace',
    )
  },
}

/** An unfiltered browse keeps only its heading, not empty chip chrome. */
export const Unfiltered: Story = {
  args: { filters: [], clearHref: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: '30 results' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Clear filters' })).toBeNull()
  },
}
