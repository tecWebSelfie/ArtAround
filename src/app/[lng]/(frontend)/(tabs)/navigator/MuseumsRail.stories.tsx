import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { expect, userEvent } from 'storybook/test'

import type { RailMuseum } from '@/lib/discover'

import { MuseumsRail } from './MuseumsRail'

const museums: RailMuseum[] = ['Galleria Borghese', 'Museo Egizio', 'Uffizi'].map((name, i) => ({
  id: `m${i}`,
  name,
  city: ['Roma', 'Torino', 'Firenze'][i],
  imageUrl: null,
  point: null,
  color: null,
}))

/** A position in central Bologna, for the stubbed geolocation. */
const BOLOGNA = { latitude: 44.4949, longitude: 11.3426, accuracy: 20 }

/**
 * The navigator home's museums rail in global mode: by name until the
 * visitor shares a position, then nearest first with distances. The
 * `museumsNear` Server Action is the Storybook mock (`__mocks__/actions.ts`).
 */
const meta = {
  title: 'Frontend/Navigator/MuseumsRail',
  component: MuseumsRail,
  parameters: {
    layout: 'padded',
    nextjs: { appDirectory: true, navigation: { segments: [['lng', 'en']] } },
  },
  args: { museums },
  beforeEach: () => {
    // Not granted yet: the rail must wait for the visitor's tap.
    const original = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: BOLOGNA, timestamp: Date.now() } as unknown as GeolocationPosition),
      },
    })
    return () =>
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original })
  },
} satisfies Meta<typeof MuseumsRail>

export default meta

type Story = StoryObj<typeof meta>

export const ByName: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Museums' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: /galleria borghese/i })).toHaveAttribute(
      'href',
      '/en/museum/m0',
    )
  },
}

/** "Use my location": the rail reorders around the shared position, with distances. */
export const NearYou: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Use my location' }))
    await expect(
      await canvas.findByRole('heading', { level: 2, name: 'Museums near you' }),
    ).toBeVisible()
    await expect(canvas.getByRole('link', { name: /pinacoteca nazionale/i })).toHaveTextContent(
      /0\.9 km/,
    )
    // Once located, the button has done its job.
    await expect(canvas.queryByRole('button', { name: 'Use my location' })).toBeNull()
  },
}
