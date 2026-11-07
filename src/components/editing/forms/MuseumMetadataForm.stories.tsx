import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import {
  MUSEUM_PHOTON_RESPONSE,
  MUSEUM_FULL_ADDRESS,
  museumAddressHandler,
  museumBasemapHandler,
} from '@/mocks/museum-location.mock'
import { createMuseum } from '@/mocks/museum.mock'
import { EditableSection } from '../EditableSection'
import { MuseumMetadataForm } from './MuseumMetadataForm'

const saved = fn()
const updateHandler = http.patch('*/api/museums/:id', async ({ request }) => {
  const data = await request.json()
  saved(data)
  return HttpResponse.json({ doc: { ...createMuseum(), ...(data as object) }, message: 'Saved' })
})

/** Exercises the real inline edit boundary: selecting is a draft until the director presses Save. */
const meta = {
  title: 'Editing/Museum Metadata',
  component: MuseumMetadataForm,
  args: { museum: createMuseum(), descriptionHTML: '<p>Museum description fixture</p>' },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="max-w-2xl p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  parameters: { msw: { handlers: [museumAddressHandler, museumBasemapHandler, updateHandler] } },
  beforeEach: () => {
    saved.mockClear()
  },
  render: (args) => (
    <EditableSection title="About this museum" canEdit form={<MuseumMetadataForm {...args} />}>
      <p>Saved museum metadata fixture</p>
    </EditableSection>
  ),
} satisfies Meta<typeof MuseumMetadataForm>
export default meta
type Story = StoryObj<typeof meta>

export const SaveAddressAndPoint: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    const input = canvas.getByRole('combobox', { name: /Address/ })
    await userEvent.clear(input)
    await userEvent.type(input, 'Brera')
    await userEvent.click(await screen.findByRole('option', { name: /Pinacoteca fixture/ }))
    await expect(input).toHaveValue(MUSEUM_FULL_ADDRESS)
    await expect(canvas.getByLabelText('City')).not.toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            address: MUSEUM_FULL_ADDRESS,
            city: 'Milano',
            latlng: MUSEUM_PHOTON_RESPONSE.features[0].geometry.coordinates,
            postalCode: '20121',
            country: 'IT',
          }),
        }),
      ),
    )
  },
}
export const UnconfirmedAddressIsBlocked: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    await userEvent.clear(canvas.getByRole('combobox', { name: /Address/ }))
    await userEvent.type(canvas.getByRole('combobox', { name: /Address/ }), 'Unconfirmed address')
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await expect(
      await canvas.findByText('Choose an address suggestion or confirm the coordinates manually.'),
    ).toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
  },
}
export const ManualFallback: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('https://photon.komoot.io/api', () => new HttpResponse(null, { status: 503 })),
        museumBasemapHandler,
        updateHandler,
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    const input = canvas.getByRole('combobox', { name: /Address/ })
    await userEvent.clear(input)
    await userEvent.type(input, 'Manual address')
    await userEvent.click(canvas.getByText('Set coordinates manually'))
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm this location' }))
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            address: 'Manual address, Milano',
            latlng: [9.19, 45.4642],
          }),
        }),
      ),
    )
  },
}

export const SelectedAddressDraft: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    const input = canvas.getByRole('combobox', { name: /Address/ })
    await userEvent.clear(input)
    await userEvent.type(input, 'Brera')
    await userEvent.click(await screen.findByRole('option', { name: /Pinacoteca fixture/ }))
    await expect(input).toHaveValue(MUSEUM_FULL_ADDRESS)
    await expect(canvas.getByLabelText('City')).not.toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
  },
}

export const CancelDiscardsDraft: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    await userEvent.clear(canvas.getByRole('combobox', { name: /Address/ }))
    await userEvent.type(canvas.getByRole('combobox', { name: /Address/ }), 'Unsaved address')
    await userEvent.click(canvas.getByRole('button', { name: /^Cancel$/ }))
    await expect(canvas.getByText('Saved museum metadata fixture')).toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
  },
}

export const ChangedCityIsBlocked: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    await userEvent.click(canvas.getByText('Set coordinates manually'))
    const city = canvas.getByRole('textbox', { name: /City/ })
    await userEvent.clear(city)
    await userEvent.type(city, 'Roma')
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await expect(
      await canvas.findByText('Choose an address suggestion or confirm the coordinates manually.'),
    ).toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
  },
}

export const MissingCityCanBeCompletedManually: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('https://photon.komoot.io/api', () =>
          HttpResponse.json({
            ...MUSEUM_PHOTON_RESPONSE,
            features: MUSEUM_PHOTON_RESPONSE.features.map((feature) => ({
              ...feature,
              properties: { ...feature.properties, city: undefined },
            })),
          }),
        ),
        museumBasemapHandler,
        updateHandler,
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit About this museum' }))
    const input = canvas.getByRole('combobox', { name: /Address/ })
    await userEvent.clear(input)
    await userEvent.type(input, 'Brera')
    await userEvent.click(await screen.findByRole('option', { name: /Pinacoteca fixture/ }))
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await expect(
      (
        await canvas.findAllByText('Choose an address with a city or complete the manual location.')
      )[0],
    ).toBeVisible()
    await expect(saved).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByText('Set coordinates manually'))
    await userEvent.type(canvas.getByRole('textbox', { name: /City/ }), 'Milano')
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm this location' }))
    await expect(input).toHaveValue('28, Via Brera, 20121, Italia, Milano')
    await userEvent.click(canvas.getByRole('button', { name: /^Save$/ }))
    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({
          location: expect.objectContaining({
            city: 'Milano',
            address: expect.stringContaining('Milano'),
          }),
        }),
      ),
    )
  },
}
