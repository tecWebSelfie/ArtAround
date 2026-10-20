'use client'

import { payloadSdk } from '@/payload-sdk'
import type { Museum } from '@/payload-types'
import { Button, Group, NumberInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { useForm } from '@mantine/form'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { useTranslation } from 'react-i18next'
import { SOURCE_LOCALE, useSave } from '../saving'

type MuseumValues = {
  name: string
  shortDescription: string
  address: string
  city: string
  latitude: number | ''
  longitude: number | ''
}

/**
 * Create a museum. The creator becomes its director (server hook
 * `appointCreatorAsDirector`) and lands on the museum page, where the
 * remaining metadata and the map can be filled in.
 */
export function MuseumCreateForm() {
  const { t } = useTranslation('editing')
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const form = useForm<MuseumValues>({
    initialValues: {
      name: '',
      shortDescription: '',
      address: '',
      city: '',
      latitude: '',
      longitude: '',
    },
    validate: {
      name: (value) => (value.trim() ? null : t('Required')),
      shortDescription: (value) => (value.trim() ? null : t('Required')),
      address: (value) => (value.trim() ? null : t('Required')),
      city: (value) => (value.trim() ? null : t('Required')),
      latitude: (value) => (value === '' ? t('Required') : null),
      longitude: (value) => (value === '' ? t('Required') : null),
    },
  })

  // Directors usually create the museum on site: one tap fills the
  // coordinates from the device's position instead of copying them from a map.
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const fillFromMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocateError(t('This device cannot share its location'))
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        form.setFieldValue('latitude', Number(coords.latitude.toFixed(6)))
        form.setFieldValue('longitude', Number(coords.longitude.toFixed(6)))
        setLocating(false)
      },
      () => {
        setLocateError(
          t('Your location is not available — allow it, or type the coordinates from a map app'),
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  const save = useSave(
    (values: MuseumValues) =>
      payloadSdk.create({
        collection: 'museums',
        locale: SOURCE_LOCALE,
        data: {
          name: values.name.trim(),
          shortDescription: values.shortDescription.trim(),
          location: {
            address: values.address.trim(),
            city: values.city.trim(),
            // Payload point fields are [longitude, latitude].
            latlng: [Number(values.longitude), Number(values.latitude)],
          },
          // `accessibility` is a virtual field the generated type still requires.
        } as RequiredDataFromCollectionSlug<'museums'>,
      }),
    (museum: Museum) => router.push(`/${lng}/museum/${museum.id}` as Route),
  )

  return (
    <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
      <Stack gap="md">
        <Title order={2}>{t('New museum')}</Title>
        <Text size="sm" c="dimmed">
          {t('You will be the director of this museum and can invite curators afterwards.')}
        </Text>
        <TextInput label={t('Name')} required {...form.getInputProps('name')} />
        <TextInput
          label={t('Short description')}
          required
          maxLength={100}
          {...form.getInputProps('shortDescription')}
        />
        <Group grow align="start">
          <TextInput label={t('Address')} required {...form.getInputProps('address')} />
          <TextInput label={t('City')} required {...form.getInputProps('city')} />
        </Group>
        <Stack gap={4}>
          <Group justify="space-between" align="center" gap="xs">
            <Text size="sm" c="dimmed">
              {t('Where the museum is on the map')}
            </Text>
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<LocateFixed size={14} aria-hidden />}
              onClick={fillFromMyLocation}
              loading={locating}
            >
              {t('Use my location')}
            </Button>
          </Group>
          {locateError && (
            <Text size="sm" c="red" role="alert">
              {locateError}
            </Text>
          )}
        </Stack>
        <Group grow align="start">
          <NumberInput
            label={t('Latitude')}
            required
            min={-90}
            max={90}
            decimalScale={6}
            {...form.getInputProps('latitude')}
          />
          <NumberInput
            label={t('Longitude')}
            required
            min={-180}
            max={180}
            decimalScale={6}
            {...form.getInputProps('longitude')}
          />
        </Group>
        <Group justify="end">
          <Button variant="default" onClick={() => router.back()} disabled={save.isPending}>
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {t('Create museum')}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
