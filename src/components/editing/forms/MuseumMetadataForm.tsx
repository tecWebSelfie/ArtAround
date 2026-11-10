'use client'

import { MuseumAddressAutocomplete } from '@/components/location/MuseumAddressAutocomplete'
import { MuseumLocationMap } from '@/components/location/MuseumLocationMap'
import {
  formatMuseumAddress,
  isMuseumPoint,
  museumLocationFromPlace,
  museumPointFromFields,
} from '@/lib/museum-location'
import { payloadSdk } from '@/payload-sdk'
import type { Museum } from '@/payload-types'
import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useEditableSection } from '../EditableSection'
import { FormActions } from '../FormActions'
import { RichTextInput } from '../RichTextInput'
import { SOURCE_LOCALE, useSave } from '../saving'
import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'

/** Director metadata: postal text and its geographic point form one draft, committed by Save or discarded by Cancel. */
export function MuseumMetadataForm({
  museum,
  descriptionHTML,
}: {
  museum: Pick<Museum, 'id' | 'name' | 'shortDescription' | 'email' | 'location'>
  descriptionHTML: string
}) {
  const { t } = useTranslation('editing')
  const { close } = useEditableSection()
  const savedPoint = isMuseumPoint(museum.location.latlng) ? museum.location.latlng : null
  const form = useForm({
    initialValues: {
      name: museum.name,
      shortDescription: museum.shortDescription,
      descriptionHTML,
      email: museum.email ?? '',
      address: formatMuseumAddress(museum.location),
      city: museum.location.city,
      region: museum.location.region,
      postalCode: museum.location.postalCode,
      country: museum.location.country,
      longitude: savedPoint ? String(savedPoint[0]) : '',
      latitude: savedPoint ? String(savedPoint[1]) : '',
      locationConfirmed: Boolean(savedPoint),
    },
    validate: {
      name: (value) => (value.trim() ? null : t('Required')),
      shortDescription: (value) => (value.trim() ? null : t('Required')),
      address: (value) => (value.trim() ? null : t('Required')),
      city: (value) =>
        value.trim() ? null : t('Choose an address with a city or complete the manual location.'),
      locationConfirmed: (value, values) =>
        value && museumPointFromFields(values.longitude, values.latitude)
          ? null
          : t('Choose an address suggestion or confirm the coordinates manually.'),
    },
  })
  const point = museumPointFromFields(form.values.longitude, form.values.latitude)
  const save = useSave(
    ({
      address,
      city,
      region,
      postalCode,
      country,
      longitude,
      latitude,
      locationConfirmed: _confirmed,
      email,
      ...values
    }: typeof form.values) => {
      const latlng = museumPointFromFields(longitude, latitude)
      // Repeat the invariant at the persistence boundary, even if submit is invoked outside the form.
      if (!_confirmed || !latlng)
        throw new Error(t('Choose an address suggestion or confirm the coordinates manually.'))
      return payloadSdk.update({
        collection: 'museums',
        id: museum.id,
        locale: SOURCE_LOCALE,
        data: {
          ...values,
          email: email.trim() || null,
          location: {
            address,
            city,
            region,
            postalCode,
            country,
            latlng,
          },
        },
      })
    },
    close,
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="sm">
        <TextInput label={t('Name')} required {...form.getInputProps('name')} />
        <TextInput
          label={t('Short description')}
          required
          maxLength={100}
          {...form.getInputProps('shortDescription')}
        />
        <RichTextInput
          label={t('Description')}
          value={form.values.descriptionHTML}
          onChange={(html) => form.setFieldValue('descriptionHTML', html)}
        />
        <TextInput label={t('Email')} type="email" {...form.getInputProps('email')} />
        <MuseumAddressAutocomplete
          value={form.values.address}
          disabled={save.isPending}
          error={form.errors.address || form.errors.locationConfirmed || form.errors.city}
          onChange={(address) => {
            // Typing a new address must never silently reuse the previous address's coordinates.
            form.setValues({ address, locationConfirmed: false })
          }}
          onSelect={(place) => {
            const location = museumLocationFromPlace(place)
            if (!location) return
            const { latlng, ...postal } = location
            form.setValues({
              ...postal,
              longitude: String(latlng[0]),
              latitude: String(latlng[1]),
              locationConfirmed: true,
            })
            form.clearFieldError('locationConfirmed')
            form.clearFieldError('address')
            form.clearFieldError('city')
          }}
        />
        {!form.values.locationConfirmed && point && (
          <Text size="sm" role="status">
            {t('This position is not confirmed for the current address.')}
          </Text>
        )}
        <MuseumLocationMap point={point} />
        <details>
          <summary>{t('Set coordinates manually')}</summary>
          <Stack gap="sm" mt="sm">
            {/* Only manual entry needs a separate locality; normal search derives it from the result. */}
            <TextInput
              label={t('City')}
              {...form.getInputProps('city')}
              style={
                {
                  '--mantine-color-error':
                    'light-dark(var(--mantine-color-red-8), var(--mantine-color-red-4))',
                } as CSSProperties
              }
              onChange={(event) =>
                form.setValues({ city: event.currentTarget.value, locationConfirmed: false })
              }
            />
            <Group grow align="start">
              <TextInput
                label={t('Longitude')}
                type="number"
                min={-180}
                max={180}
                step="any"
                value={form.values.longitude}
                onChange={(event) =>
                  form.setValues({ longitude: event.currentTarget.value, locationConfirmed: false })
                }
              />
              <TextInput
                label={t('Latitude')}
                type="number"
                min={-90}
                max={90}
                step="any"
                value={form.values.latitude}
                onChange={(event) =>
                  form.setValues({ latitude: event.currentTarget.value, locationConfirmed: false })
                }
              />
            </Group>
            <Button
              type="button"
              variant="light"
              disabled={!point || !form.values.address.trim() || !form.values.city.trim()}
              onClick={() => {
                form.setValues({
                  address: formatMuseumAddress(form.values),
                  locationConfirmed: true,
                })
                form.clearFieldError('locationConfirmed')
                form.clearFieldError('city')
                form.clearFieldError('address')
              }}
            >
              {t('Confirm this location')}
            </Button>
          </Stack>
        </details>
        <FormActions saving={save.isPending} autoContrast submitColor="museum.8" />
      </Stack>
    </form>
  )
}
