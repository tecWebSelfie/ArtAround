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

/** Each arrow walks 2 m; north is the top of the map. */
export const Walk: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Walk north' }))
    await expect(args.onMove).toHaveBeenLastCalledWith(0, 2)
    await userEvent.click(canvas.getByRole('button', { name: 'Walk west' }))
    await expect(args.onMove).toHaveBeenLastCalledWith(-2, 0)
  },
}
