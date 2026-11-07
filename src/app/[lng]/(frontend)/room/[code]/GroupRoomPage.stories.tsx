import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { getRouter } from '@storybook/nextjs-vite/navigation.mock'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { GroupRoomPage } from './GroupRoomPage'

/**
 * The join page of a group visit (`/[lng]/room/{code}`), for someone not in the
 * group yet: before typing their name, they see which tour it is and who
 * invited them, so they know they are joining the right visit
 * (requirement 10 of `docs/plan/requisiti-18-33.md`).
 */
const meta = {
  title: 'Group/GroupRoomPage',
  component: GroupRoomPage,
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  parameters: { nextjs: { navigation: { segments: [['lng', 'en']] } } },
} satisfies Meta<typeof GroupRoomPage>

export default meta
type Story = StoryObj<typeof meta>

export const JoinShowsTourAndHost: Story = {
  args: {
    code: 'AB3X9K',
    hostName: 'Prof. Fontana',
    showResults: false,
    tour: {
      id: 'tour-1',
      museumId: 'museum-1',
      title: 'Masterpieces of the Pinacoteca',
      thumbnail: null,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.findByText('Masterpieces of the Pinacoteca')).resolves.toBeTruthy()
    await expect(canvas.findByText(/Prof\. Fontana invited you/)).resolves.toBeTruthy()
  },
}

/** The guest selects an age on this device before following the family. */
export const FamilyReader: Story = {
  args: {
    ...JoinShowsTourAndHost.args,
    tour: { ...JoinShowsTourAndHost.args!.tour!, childrenAges: [5, 8] },
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('combobox', { name: 'Reading for' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Child aged 5' }))
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenCalledWith(
        expect.stringContaining('age=5&audience=children'),
        { scroll: false },
      ),
    )
  },
}
