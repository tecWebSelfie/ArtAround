import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect, waitFor } from 'storybook/test'

import { mockTourMinimal, mockToursList } from '@/mocks/tour.mock'
import type { Tour } from '@/payload-types'

import { ToursCarousel } from './ToursCarousel'

// Presets for the `tours` select control: the panel shows the label, Storybook
// resolves it through `argTypes.tours.mapping` to the actual Tour[] before render.
const toursPresets = {
  '3 tours': mockToursList,
  'Single tour': [mockTourMinimal],
  Empty: [],
} satisfies Record<string, Tour[]>

// Storybook resolves the authored value through `argTypes.tours.mapping` right
// before render, so the arg is the preset key while ToursCarousel still gets Tour[].
const toursPreset = (preset: keyof typeof toursPresets) => preset as unknown as Tour[]

const meta = {
  title: 'Tours Carousel',
  component: ToursCarousel,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } },
  },
  tags: ['autodocs'],
  args: {
    tours: toursPreset('3 tours'),
  },
  argTypes: {
    tours: {
      control: 'select',
      options: Object.keys(toursPresets),
      mapping: toursPresets,
      description: 'Preset list of tour documents rendered by the carousel.',
    },
  },
} satisfies Meta<typeof ToursCarousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Tours' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /see all/i })).toHaveAttribute(
      'href',
      '/en/search/tours',
    )
    // The front card is one link into its tour.
    const open = canvas.getByRole('link', { name: /open the tour/i })
    const first = open.getAttribute('href')
    await expect(first).toMatch(/^\/en\/tour\//)
    // The pager flips the deck: the front link follows the selected tour.
    await userEvent.click(canvas.getByRole('button', { name: 'Show next tour' }))
    await waitFor(() => expect(open.getAttribute('href')).not.toBe(first))
  },
}

/** One tour: no pager, the deck is just the card. */
export const SingleTour: Story = {
  args: {
    tours: toursPreset('Single tour'),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Show next tour' })).toBeNull()
  },
}

export const Empty: Story = {
  args: {
    tours: toursPreset('Empty'),
  },
}
