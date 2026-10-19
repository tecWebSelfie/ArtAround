import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Button } from '@mantine/core'
import { expect } from 'storybook/test'

import { SearchResultCard, SearchResultsGrid } from './SearchResultCard'

// The shared result container behind Search/Tours|Objects|Contents Results.
// Those stories cover the real data mapping; these pin the card's own variants.
const meta = {
  title: 'Search/Result Card',
  component: SearchResultCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    imageAlt: 'Mona Lisa',
    title: 'La Monna Lisa e i suoi misteri',
    description:
      'Un percorso tra i dettagli meno noti del ritratto più famoso del mondo, dalla tecnica allo sfumato.',
  },
} satisfies Meta<typeof SearchResultCard>

type Story = StoryObj<typeof meta>

export default meta

export const Default: Story = {
  play: async ({ canvas }) => {
    // No image URL: the shared placeholder must still render with the alt text.
    const image = await canvas.findByAltText('Mona Lisa')
    await expect(image.getAttribute('src')).toContain('placehold.co')
  },
}

export const ContentOutline: Story = {
  args: {
    variant: 'content',
    description: null,
  },
}

export const WithAction: Story = {
  args: {
    children: (
      <Button size="compact-sm" variant="light" fullWidth>
        View details
      </Button>
    ),
  },
}

export const EmptyGrid: Story = {
  render: () => (
    <SearchResultsGrid
      items={[]}
      getKey={() => ''}
      renderItem={() => null}
      emptyLabel="No visits found"
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.findByText('No visits found')).resolves.toBeTruthy()
  },
}
