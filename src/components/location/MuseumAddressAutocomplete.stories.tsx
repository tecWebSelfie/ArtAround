import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { expect, fn, screen, userEvent, within } from 'storybook/test'
import { ModelGenerationProviders } from '@/../.storybook/model-generation-providers'
import { museumLocationFromPlace } from '@/lib/museum-location'
import { museumAddressHandler, MUSEUM_FULL_ADDRESS } from '@/mocks/museum-location.mock'
import { MuseumAddressAutocomplete } from './MuseumAddressAutocomplete'

/** The hook stays real; MSW replaces only the public Photon service. */
const meta = {
  title: 'Editing/Museum Address Autocomplete',
  component: MuseumAddressAutocomplete,
  args: { value: '', onChange: fn(), onSelect: fn() },
  decorators: [
    (Story) => (
      <ModelGenerationProviders>
        <div className="max-w-xl p-4">
          <Story />
        </div>
      </ModelGenerationProviders>
    ),
  ],
  parameters: { msw: { handlers: [museumAddressHandler] } },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value)
    return (
      <MuseumAddressAutocomplete
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next)
          args.onChange(next)
        }}
        onSelect={(place) => {
          setValue(museumLocationFromPlace(place)?.address ?? '')
          args.onSelect(place)
        }}
      />
    )
  },
} satisfies Meta<typeof MuseumAddressAutocomplete>
export default meta
type Story = StoryObj<typeof meta>

export const SelectWithKeyboard: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole('combobox', { name: /Address/ })
    await userEvent.type(input, 'Brera')
    await expect(await screen.findByRole('option', { name: /Pinacoteca fixture/ })).toBeVisible()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(input).toHaveValue(MUSEUM_FULL_ADDRESS)
    await expect(args.onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ longitude: 9.1881, latitude: 45.4719 }),
    )
    await expect(args.onChange).toHaveBeenCalled()
  },
}
export const NoResults: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('https://photon.komoot.io/api', () =>
          HttpResponse.json({ type: 'FeatureCollection', features: [] }),
        ),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: /Address/ }), 'Unknown')
    await expect(await screen.findByText('No addresses found. Try adding the city.')).toBeVisible()
  },
}
export const ServiceUnavailable: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('https://photon.komoot.io/api', () => new HttpResponse(null, { status: 503 })),
      ],
    },
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: /Address/ }), 'Brera')
    await expect(
      await within(document.body).findAllByText(
        'Address search is unavailable. Try editing the search or enter coordinates manually.',
      ),
    ).not.toHaveLength(0)
  },
}
export const SavedAddress: Story = {
  args: { value: MUSEUM_FULL_ADDRESS },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('combobox', { name: /Address/ })).toHaveValue(MUSEUM_FULL_ADDRESS)
    await expect(args.onSelect).not.toHaveBeenCalled()
  },
}

export const SuggestionsOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: /Address/ }), 'Brera')
    await expect(await screen.findByRole('option', { name: /Pinacoteca fixture/ })).toBeVisible()
  },
}
