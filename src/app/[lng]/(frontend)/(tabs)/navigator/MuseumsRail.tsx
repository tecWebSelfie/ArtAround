'use client'

import { DiscoverRail, MuseumRailCard } from '@/components/mantine/DiscoverRail'
import type { RailMuseum } from '@/lib/discover'
import { distanceKm } from '@/lib/museum-location'
import { Button } from '@mantine/core'
import { LocateFixed } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useDevicePosition } from '@/lib/use-device-position'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { museumsNear } from './actions'

/**
 * The navigator home's context rail in global mode: museums, by name until
 * the visitor shares a position, then nearest first with their distance.
 *
 * Location is never asked for on load (surface brief): when the browser
 * already grants it, the rail orders itself (`useDevicePosition`); otherwise
 * "Use my location" asks once, on the visitor's tap. The server only ever
 * sees the position rounded to two decimals (about a kilometre); distances are
 * computed here from the exact one, which never leaves the device.
 */

type Near = { origin: GeolocationCoordinates; museums: RailMuseum[] } | 'failed' | null

const round = (value: number) => Math.round(value * 100) / 100

export function MuseumsRail({ museums }: { museums: RailMuseum[] }) {
  const { t } = useTranslation('navigator-discover')
  const { lng } = useParams<{ lng: string }>()
  const { status, coords, locate } = useDevicePosition()
  const [near, setNear] = useState<Near>(null)

  // A new position orders the rail around it (nearest museums from the server).
  useEffect(() => {
    if (!coords) return
    let cancelled = false
    museumsNear({ latitude: round(coords.latitude), longitude: round(coords.longitude), lng })
      .catch(() => null)
      .then((list) => {
        if (!cancelled) setNear(list?.length ? { origin: coords, museums: list } : 'failed')
      })
    return () => {
      cancelled = true
    }
  }, [coords, lng])

  const located = near && near !== 'failed' ? near : null
  // Asking the server for the nearest museums still counts as locating, so
  // the button keeps its spinner until the rail is ordered.
  const locating = status === 'locating' || (status === 'located' && near === null)
  // Hidden once located, or once a position failed or was refused (the rail
  // then stays by name).
  const offerLocate = !located && status !== 'unavailable' && near !== 'failed'
  const shown = located?.museums ?? museums
  if (shown.length === 0) return null

  return (
    <DiscoverRail
      title={located ? t('Museums near you') : t('Museums')}
      action={
        offerLocate && (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<LocateFixed size={16} aria-hidden />}
            loading={locating}
            onClick={locate}
            className="shrink-0"
          >
            {t('Use my location')}
          </Button>
        )
      }
    >
      {shown.map((museum) => (
        <MuseumRailCard
          key={museum.id}
          museum={museum}
          distanceKm={located && museum.point ? distanceKm(located.origin, museum.point) : null}
        />
      ))}
    </DiscoverRail>
  )
}
