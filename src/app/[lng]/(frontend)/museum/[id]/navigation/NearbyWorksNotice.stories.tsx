import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { NearbyWorksNotice } from './NearbyWorksNotice'

// Sensor-free presentation states keep the decision and explicit actions reviewable.
const meta = {
  title: 'Tour Navigation/Nearby Works',
  component: NearbyWorksNotice,
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
    works: [
      { id: 'a', name: 'The Annunciation', thumbnail: '/models/default-standee.svg', next: true },
    ],
    onOpen: fn(),
    onConfirm: fn(),
    onDismiss: fn(),
  },
} satisfies Meta<typeof NearbyWorksNotice>
export default meta
type Story = StoryObj<typeof meta>

export const NextStop: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Your next stop is nearby')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Open The Annunciation' }))
    await expect(args.onOpen).toHaveBeenCalledWith('a')
    await expect(args.onConfirm).not.toHaveBeenCalled()
    await userEvent.click(
      canvas.getByRole('button', { name: 'Confirm position at The Annunciation' }),
    )
    await expect(args.onConfirm).toHaveBeenCalledWith('a')
  },
}
export const Discovery: Story = {
  args: { works: [{ id: 'b', name: 'Portrait of a young woman', next: false }] },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Discover a nearby work')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss nearby works' }))
    await expect(args.onDismiss).toHaveBeenCalledOnce()
  },
}
export const Choose: Story = {
  args: {
    works: [
      { id: 'a', name: 'The Annunciation', next: true },
      {
        id: 'b',
        name: 'A much longer title identifying the adjacent work in the same gallery',
        next: false,
      },
      { id: 'c', name: 'Portrait', next: false },
      { id: 'd', name: 'Landscape', next: false },
    ],
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText('Which work is in front of you?')).toBeVisible()
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm position at Portrait' }))
    await expect(args.onConfirm).toHaveBeenCalledWith('c')
  },
}
export const NoNearbyWorks: Story = {
  args: { works: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('region')).not.toBeInTheDocument()
  },
}
