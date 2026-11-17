import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { expect, fn, userEvent } from 'storybook/test'
import { GpsSimulator } from './GpsSimulator'

const meta = {
  title: 'Tour Navigation/GPS Simulator',
  component: GpsSimulator,
  // Supplies the i18next instance (interpolated English fallbacks).
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <Story />
      </ModelGenerationProviders>
    ),
  ],
  args: { onMove: fn() },
} satisfies Meta<typeof GpsSimulator>
export default meta
type Story = StoryObj<typeof meta>

/** A tapped arrow nudges 1 m (north is the top of the map); holding one walks. */
export const Nudge: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('application', { name: /Simulated GPS/ }))
    await userEvent.keyboard('{ArrowUp}')
    await expect(args.onMove).toHaveBeenLastCalledWith(0, 1)
    await userEvent.keyboard('{ArrowLeft}')
    await expect(args.onMove).toHaveBeenLastCalledWith(-1, 0)
  },
}
