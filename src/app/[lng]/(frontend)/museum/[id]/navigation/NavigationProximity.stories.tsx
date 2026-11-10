import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { useState } from 'react'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { NavigationProximity } from './NavigationProximity'

const meta = {
  title: 'Tour Navigation/Live Proximity',
  component: NavigationProximity,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  args: {
    point: [0, 0],
    heading: 0,
    rooms: {
      rooms: [],
      doors: [],
      objects: [
        { objectId: 'north', point: [0, -2] },
        { objectId: 'east', point: [2, 0] },
      ],
    },
    catalog: [
      { id: 'north', name: 'Northern work', contents: [] },
      { id: 'east', name: 'Eastern work', contents: [] },
    ],
    nextId: 'north',
    tourObjectIds: new Set(['north']),
    discoveries: true,
    scopeKey: 'museum:confirmed:device',
    onOpen: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof NavigationProximity>
export default meta
type Story = StoryObj<typeof meta>

/** Real controller, moved through the same GPS-plan points a sensor delivers. */
export const WalkAndTurn: Story = {
  render: function Walk(args) {
    const [north, setNorth] = useState(0)
    const [heading, setHeading] = useState<number | null>(0)
    return (
      <>
        <div className="mb-3 flex flex-wrap gap-2">
          <button onClick={() => setNorth(1.5)}>Small GPS fluctuation</button>
          <button onClick={() => setNorth(4)}>Walk away</button>
          <button onClick={() => setNorth(0)}>Return</button>
          <button onClick={() => setHeading(90)}>Face east</button>
          <button onClick={() => setHeading(null)}>Compass unavailable</button>
        </div>
        <NavigationProximity {...args} point={[0, north]} heading={heading} />
      </>
    )
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Your next stop is nearby')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Small GPS fluctuation' }))
    await expect(canvas.getByText('Northern work')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Walk away' }))
    await expect(canvas.queryByRole('region')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Return' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Face east' }))
    await expect(canvas.getByText('Discover a nearby work')).toBeVisible()
    await expect(canvas.queryByText('Northern work')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Compass unavailable' }))
    await expect(canvas.getByText('Which work is in front of you?')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss nearby works' }))
    await expect(canvas.queryByRole('region')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Small GPS fluctuation' }))
    await expect(canvas.queryByRole('region')).not.toBeInTheDocument()
    await expect(args.onOpen).not.toHaveBeenCalled()
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}
