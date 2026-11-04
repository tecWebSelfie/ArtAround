import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { GroupRequestList } from './GroupRequests'

/** The host's "who asked what" list in the group panel, without a LiveKit room. */
const meta = {
  title: 'Group/GroupRequestList',
  component: GroupRequestList,
  // Supplies the i18next instance (interpolated English fallbacks).
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
} satisfies Meta<typeof GroupRequestList>

export default meta
type Story = StoryObj<typeof meta>

/** Each guest with their count and, per stop, what they asked for. */
export const TwoGuestsAsking: Story = {
  args: {
    guests: [
      {
        identity: 'guest-1',
        name: 'Marco',
        requests: [
          { kind: 'more', stop: 0, at: 1 },
          { kind: 'level:easy', stop: 2, at: 2 },
          { kind: 'shorter', stop: 2, at: 3 },
        ],
      },
      { identity: 'guest-2', name: 'Giulia', requests: [{ kind: 'children', stop: 1, at: 4 }] },
      { identity: 'guest-3', name: 'Luca', requests: [] },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Requests')).toBeVisible()
    await expect(canvas.getByText('Stop 3: Easy wording, Shorter')).toBeVisible()
    await expect(canvas.getByText('Stop 2: For children')).toBeVisible()
    // Guests who asked nothing are not listed.
    await expect(canvas.queryByText('Luca')).toBeNull()
  },
}
