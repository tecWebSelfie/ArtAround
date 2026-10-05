import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect, waitFor } from 'storybook/test'

import type { Tour } from '@/payload-types'
import { mockTourMinimal, mockToursList } from '@/mocks/tour.mock'

import { ToursCarousel } from './ToursCarousel'

// Presets for the `tours` select control: the panel shows the label, Storybook
// resolves it through `argTypes.tours.mapping` to the actual Tour[] before render.
const toursPresets = {
  '3 tours': mockToursList,
  'Single tour': [mockTourMinimal],
  'Empty': [],
} satisfies Record<string, Tour[]>

// Storybook resolves the authored value through `argTypes.tours.mapping` right
// before render, so the arg is the preset key while ToursCarousel still gets Tour[].
const toursPreset = (preset: keyof typeof toursPresets) => preset as unknown as Tour[]

// Flat args keep one control per field in the addon panel: `tours` is the data
// the carousel renders, the rest are the Paper props the component spreads.
const meta = {
  title: 'Tours Carousel',
  component: ToursCarousel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    tours: toursPreset('3 tours'),
    withBorder: true,
    shadow: 'sm',
    radius: 'md',
    p: 'md',
  },
  argTypes: {
    tours: {
      control: 'select',
      options: Object.keys(toursPresets),
      mapping: toursPresets,
      description: 'Preset list of tour documents rendered by the carousel.',
    },
    withBorder: {
      control: 'boolean',
      description: 'Paper: adds a border to the root element.',
    },
    shadow: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Paper: key of `theme.shadows` (or any CSS box-shadow).',
    },
    radius: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Paper: key of `theme.radius` (or any CSS border-radius).',
    },
    p: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Box shorthand for padding on the Paper root.',
    },
  },
} satisfies Meta<typeof ToursCarousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Smoke guard: the carousel must render its Paper shell without crashing.
    // The shell is mounted asynchronously, so wait for it instead of asserting eagerly.
    await waitFor(() => {
      expect(canvasElement.childElementCount).toBeGreaterThan(0)
    })
  },
}

export const Empty: Story = {
  args: {
    tours: toursPreset('Empty'),
    withBorder: false,
    shadow: 'none',
  },
}

export const Elevated: Story = {
  args: {
    shadow: 'xl',
    radius: 'xl',
    p: 'xl',
  },
}
