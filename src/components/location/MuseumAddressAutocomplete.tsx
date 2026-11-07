'use client'

import { isMuseumPoint } from '@/lib/museum-location'
import { usePhotonAutocomplete, type MapPlace } from '@asammad48/react-map-place'
import {
  Combobox,
  ComboboxDropdown,
  ComboboxEmpty,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTarget,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Map Place owns requests/debounce/cache; Mantine owns the accessible field and option list. */
export function MuseumAddressAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  onSelect: (place: MapPlace) => void
  error?: ReactNode
  disabled?: boolean
}) {
  const { t, i18n } = useTranslation('editing')
  const language = i18n.resolvedLanguage?.split('-')[0] ?? 'en'
  const search = usePhotonAutocomplete({
    endpoint: process.env.NEXT_PUBLIC_PHOTON_ENDPOINT || 'https://photon.komoot.io',
    // The public Photon instance's default index supports these label languages.
    language: ['en', 'de', 'fr'].includes(language) ? language : 'en',
    minimumQueryLength: 3,
    debounceMs: 300,
    requestTimeoutMs: 8000,
  })
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })
  const places = search.results.filter((place) => isMuseumPoint([place.longitude, place.latitude]))
  const searchingCurrentText = search.query === value && value.trim().length >= 3
  const serviceError = search.error
    ? t('Address search is unavailable. Try editing the search or enter coordinates manually.')
    : undefined

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(id) => {
        const place = places.find((item) => item.id === id)
        if (!place || disabled) return
        onSelect(place)
        search.setQuery('')
        combobox.closeDropdown()
      }}
    >
      <ComboboxTarget withExpandedAttribute>
        <TextInput
          // Keep small helper/error text readable in both themes without changing global Mantine tokens.
          style={
            {
              '--mantine-color-dimmed': 'var(--mantine-color-text)',
              '--mantine-color-error':
                'light-dark(var(--mantine-color-red-8), var(--mantine-color-red-4))',
            } as CSSProperties
          }
          label={t('Address')}
          required
          disabled={disabled}
          value={value}
          description={t('Type at least 3 characters and choose an address.')}
          error={error || serviceError}
          onChange={(event) => {
            const next = event.currentTarget.value
            onChange(next)
            search.setQuery(next)
            combobox.resetSelectedOption()
            if (next.trim().length >= 3) combobox.openDropdown()
            else combobox.closeDropdown()
          }}
          onFocus={() => {
            if (searchingCurrentText) combobox.openDropdown()
          }}
          onBlur={() => combobox.closeDropdown()}
        />
      </ComboboxTarget>
      <ComboboxDropdown>
        <ComboboxOptions className="max-h-64 overflow-y-auto" aria-label={t('Address suggestions')}>
          {searchingCurrentText &&
            places.map((place) => (
              <ComboboxOption key={place.id} value={place.id}>
                <Text size="sm" fw={500}>
                  {place.name}
                </Text>
                <Text size="xs">{place.formattedAddress}</Text>
              </ComboboxOption>
            ))}
        </ComboboxOptions>
        {searchingCurrentText && places.length === 0 && (
          <ComboboxEmpty>
            <span role="status" style={{ color: 'var(--mantine-color-text)' }}>
              {search.loading
                ? t('Searching addresses…')
                : serviceError || t('No addresses found. Try adding the city.')}
            </span>
          </ComboboxEmpty>
        )}
      </ComboboxDropdown>
    </Combobox>
  )
}
