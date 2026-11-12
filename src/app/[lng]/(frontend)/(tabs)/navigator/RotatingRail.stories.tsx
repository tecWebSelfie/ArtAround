import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect } from 'storybook/test'

import type { RotatingCandidate, RailTour } from '@/lib/discover'

import { RotatingRail } from './RotatingRail'

const tours = (prefix: string): RailTour[] =>
  [1, 2, 3].map((n) => ({
    id: `${prefix}-${n}`,
    title: `${prefix} tour ${n}`,
    imageUrl: null,
    stops: n + 2,
    minutes: 20,
  }))

const candidates: RotatingCandidate[] = [
  { id: 'quick', title: 'Quick visits', tours: tours('Quick') },
  { id: 'step-free', title: 'Step-free tours', tours: tours('Step-free') },
]

/**
 * The home's rotating rail: one collection per visit, kept for the visit
 * (sessionStorage) and never the same as the previous visit's (localStorage).
 */
const meta = {
  title: 'Frontend/Navigator/RotatingRail',
  component: RotatingRail,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } },
  },
  args: { candidates },
} satisfies Meta<typeof RotatingRail>

export default meta

type Story = StoryObj<typeof meta>

/** The previous visit showed "Quick visits", so this one shows the other collection. */
export const NotTheSameTwiceInARow: Story = {
  beforeEach: () => {
    sessionStorage.removeItem('aa-discover-rail')
    localStorage.setItem('aa-discover-last', 'quick')
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 2, name: 'Step-free tours' }),
    ).toBeVisible()
    await expect(sessionStorage.getItem('aa-discover-rail')).toBe(JSON.stringify('step-free'))
    await expect(canvas.getByRole('link', { name: /see all/i })).toHaveAttribute(
      'href',
      '/en/marketplace?kind=tours',
    )
  },
}

/** Within a visit the pick stays, whatever the previous visit showed. */
export const KeptWithinAVisit: Story = {
  beforeEach: () => {
    sessionStorage.setItem('aa-discover-rail', JSON.stringify('quick'))
    localStorage.setItem('aa-discover-last', 'quick')
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 2, name: 'Quick visits' }),
    ).toBeVisible()
  },
}
