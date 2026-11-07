'use client'

import type { MuseumPoint } from '@/lib/museum-location'
import { MapPlaceMap } from '@asammad48/react-map-place'
import { Anchor, Button, Stack, Text, useComputedColorScheme } from '@mantine/core'
import { setWorkerUrl } from 'maplibre-gl'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '@asammad48/react-map-place/styles'
import 'maplibre-gl/dist/maplibre-gl.css'
import './museum-location-map.css'

// MapLibre 6 ships the worker and shared module separately; postinstall copies both to our origin.
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

/** The published map component handles pan/zoom and pin rendering; Mantine supplies framing and recovery. */
export default function MuseumLocationMapCanvas({ point }: { point: MuseumPoint }) {
  const { t } = useTranslation('editing')
  const scheme = useComputedColorScheme('light')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [longitude, latitude] = point
  const coordinates = { longitude, latitude }
  const styleUrl =
    scheme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  const href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`

  return (
    <Stack gap="xs">
      {failed ? (
        <div role="status">
          <Text size="sm">
            {t('The map could not be loaded. The saved address is still available.')}
          </Text>
          <Button
            type="button"
            variant="subtle"
            onClick={() => {
              setFailed(false)
              setLoading(true)
              setAttempt((value) => value + 1)
            }}
          >
            {t('Retry map')}
          </Button>
        </div>
      ) : (
        <div role="region" aria-label={t('Museum location')} aria-busy={loading}>
          <MapPlaceMap
            key={`${styleUrl}:${attempt}`}
            className="museum-location-map"
            height={256}
            center={coordinates}
            zoom={16}
            styleUrl={styleUrl}
            // Initial marker effects run before asynchronous map creation. Supply the point after load.
            destinationCoordinates={loading ? undefined : coordinates}
            showOriginMarker={false}
            showDestinationMarker
            allowMapClickSelection={false}
            allowMarkerDrag={false}
            primaryColor="var(--mantine-primary-color-filled)"
            onLoadingChange={setLoading}
            onError={() => setFailed(true)}
          />
        </div>
      )}
      <Anchor
        c="light-dark(var(--mantine-primary-color-8), var(--mantine-primary-color-4))"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
      >
        {t('Open location in OpenStreetMap')}
      </Anchor>
    </Stack>
  )
}
