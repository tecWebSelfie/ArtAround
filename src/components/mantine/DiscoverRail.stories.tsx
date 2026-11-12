import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import type { RailMuseum, RailTour } from '@/lib/discover'
import type { Route } from 'next'

import { DiscoverRail, MuseumRailCard, TourRail } from './DiscoverRail'

const tours: RailTour[] = [
  { id: 't1', title: 'Masterpieces in an hour', imageUrl: null, stops: 6, minutes: 60 },
  { id: 't2', title: 'The bronze age, room by room', imageUrl: null, stops: 4, minutes: 25 },
  { id: 't3', title: 'Light and colour', imageUrl: null, stops: 1, minutes: null },
  { id: 't4', title: 'Faces of the Renaissance', imageUrl: null, stops: 8, minutes: 45 },
]

const museums: RailMuseum[] = [
  {
    id: 'm1',
    name: 'Museo Egizio',
    city: 'Torino',
    imageUrl: null,
    point: [7.684, 45.068],
    color: '#c2410c',
  },
  {
    id: 'm2',
    name: 'Pinacoteca di Brera',
    city: 'Milano',
    imageUrl: null,
    point: [9.188, 45.472],
    color: null,
  },
  { id: 'm3', name: 'Uffizi', city: 'Firenze', imageUrl: null, point: null, color: '#1d4ed8' },
]

/** The navigator home's discover rails: a titled row of square cover cards. */
const meta = {
  title: 'Frontend/Navigator/DiscoverRail',
  component: DiscoverRail,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } },
  },
  args: { title: 'Museums near you', children: null },
} satisfies Meta<typeof DiscoverRail>

export default meta

type Story = StoryObj<typeof meta>

/** A rail of tours (`TourRail`): each card one link, with its stops and minutes. */
export const Tours: Story = {
  render: () => (
    <TourRail title="Quick visits" tours={tours} seeAllHref={'/en/marketplace' as Route} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Quick visits' })).toBeVisible()
    // Each card is one link to the tour, named by its title and figures.
    await expect(canvas.getByRole('link', { name: /masterpieces in an hour/i })).toHaveAttribute(
      'href',
      '/en/tour/t1',
    )
    // Figures: the minutes (formatted by Intl, so they show without i18next).
    await expect(canvas.getByText('60 min')).toBeVisible()
    await expect(canvas.getAllByRole('heading', { level: 3 })).toHaveLength(tours.length)
  },
}

export const Museums: Story = {
  args: {
    children: museums.map((museum, index) => (
      <MuseumRailCard key={museum.id} museum={museum} distanceKm={[1.24, 12.6, null][index]} />
    )),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /museo egizio/i })).toHaveAttribute(
      'href',
      '/en/museum/m1',
    )
    // One decimal under 10 km, whole kilometres beyond.
    await expect(canvas.getByText('1.2 km')).toBeVisible()
    await expect(canvas.getByText('13 km')).toBeVisible()
  },
}
