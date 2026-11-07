import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { expect, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { museumBasemapHandler } from '@/mocks/museum-location.mock'
import { MuseumLocationMap } from './MuseumLocationMap'

/** A real MapLibre canvas with a synthetic background verifies initial pin placement and recovery. */
const meta = {
  title: 'Museum/Geographic Location',
  component: MuseumLocationMap,
  args: { point: [9.1881, 45.4719] },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="max-w-xl p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  parameters: { msw: { handlers: [museumBasemapHandler] } },
} satisfies Meta<typeof MuseumLocationMap>
export default meta
type Story = StoryObj<typeof meta>

export const SavedPosition: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByRole('region', { name: 'Museum location' }, { timeout: 20000 }),
    ).toBeVisible()
    await waitFor(
      () => expect(canvasElement.querySelector('.rmp-marker--destination')).toBeInTheDocument(),
      { timeout: 20000 },
    )
    await expect(canvas.getByRole('region', { name: 'Museum location' })).toHaveAttribute(
      'aria-busy',
      'false',
    )
    await expect(
      canvas.getByRole('link', { name: 'Open location in OpenStreetMap' }),
    ).toHaveAttribute('href', expect.stringContaining('mlat=45.4719&mlon=9.1881'))
  },
}
export const MissingPosition: Story = {
  args: { point: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('The museum position has not been set.')).toBeVisible()
    await expect(canvas.queryByRole('region', { name: 'Museum location' })).not.toBeInTheDocument()
  },
}
export const MapUnavailable: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(
          'https://basemaps.cartocdn.com/gl/:style/style.json',
          () => new HttpResponse(null, { status: 503 }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('The map could not be loaded. The saved address is still available.'),
    ).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Retry map' })).toBeEnabled()
    await expect(canvas.getByRole('link', { name: 'Open location in OpenStreetMap' })).toBeVisible()
  },
}
