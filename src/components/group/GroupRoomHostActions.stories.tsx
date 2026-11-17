import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { GroupRoomHostActions } from './GroupRoomHostActions'

const meta = {
  title: 'Group/GroupRoomHostActions',
  component: GroupRoomHostActions,
  args: {
    tourId: 'tour-1',
    started: false,
    onStart: fn(),
    onEnd: fn(),
  },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  parameters: { nextjs: { navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof GroupRoomHostActions>

export default meta
type Story = StoryObj<typeof meta>

/** An entitled host can start the group and retains the end action. */
export const AuthorizedHost: Story = {
  args: { canStart: true },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start the tour' }))
    await expect(args.onStart).toHaveBeenCalledOnce()
    await expect(canvas.getByRole('button', { name: 'End the group tour' })).toBeVisible()
  },
}

/** A host without access gets a purchase path, never a start action. */
export const LockedTour: Story = {
  args: { canStart: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('The host needs to unlock this tour before starting the group.'),
    ).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Start the tour' })).toBeNull()
    await expect(canvas.getByRole('link', { name: 'Review tour access' })).toHaveAttribute(
      'href',
      '/en/tour/tour-1',
    )
  },
}
