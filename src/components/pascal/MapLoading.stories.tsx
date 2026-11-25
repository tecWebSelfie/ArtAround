import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { MapLoading } from './MapLoading'

/**
 * The museum map's loading state, as the map area shows it from the moment
 * navigation opens until the 3D scene is framed.
 */
const meta = {
  title: 'Pascal/MapLoading',
  component: MapLoading,
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="h-[28rem]">
      <MapLoading />
    </div>
  ),
} satisfies Meta<typeof MapLoading>

export default meta
type Story = StoryObj<typeof meta>

/** A status region that names the wait, over the page's own surface. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status')
    await expect(status).toHaveTextContent('Loading map…')
    await expect(status).toBeVisible()
  },
}
