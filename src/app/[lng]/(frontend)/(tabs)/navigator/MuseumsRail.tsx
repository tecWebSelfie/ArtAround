'use client'

import { DiscoverRail, MuseumRailCard } from '@/components/mantine/DiscoverRail'
import type { RailMuseum } from '@/lib/discover'
import { distanceKm } from '@/lib/museum-location'
import { Button } from '@mantine/core'
import { LocateFixed } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { museumsNear } from './actions'

/**
 * The navigator home's context rail in global mode: museums, by name until
 * the visitor shares a position, then nearest first with their distance.
 *
 * Location is never asked for on load (surface brief): when the browser
 * already grants it, the rail orders itself; otherwise "Use my location" asks
 * once, on the visitor's tap. The server only ever sees the position rounded
 * to two decimals (about a kilometre); distances are computed here from the
 * exact one, which never leaves the device.
 */

type State =
  | { kind: 'idle' | 'locating' | 'unavailable' }
  | { kind: 'located'; origin: GeolocationCoordinates; museums: RailMuseum[] }

const round = (value: number) => Math.round(value * 100) / 100

export function MuseumsRail({ museums }: { museums: RailMuseum[] }) {
  const { t } = useTranslation('navigator-discover')
  const { lng } = useParams<{ lng: string }>()
  const [state, setState] = useState<State>({ kind: 'idle' })

  const locate = () => {
    if (!('geolocation' in navigator)) return setState({ kind: 'unavailable' })
    setState({ kind: 'locating' })
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const near = await museumsNear({
          latitude: round(coords.latitude),
          longitude: round(coords.longitude),
          lng,
        }).catch(() => null)
        setState(
          near?.length
            ? { kind: 'located', origin: coords, museums: near }
            : { kind: 'unavailable' },
        )
      },
      () => setState({ kind: 'unavailable' }),
      { maximumAge: 10 * 60_000, timeout: 15_000 },
    )
  }

  // Already granted (an earlier visit, or the map's GPS): order the rail at once.
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((permission) => {
        if (!cancelled && permission.state === 'granted') locate()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Once per mount: `locate` reads nothing that changes between renders but `lng`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const located = state.kind === 'located' ? state : null
  const shown = located?.museums ?? museums
  if (shown.length === 0) return null

  return (
    <DiscoverRail
      title={located ? t('Museums near you') : t('Museums')}
      action={
        // Hidden once located, or once a position failed or was refused
        // (the rail then stays by name).
        (state.kind === 'idle' || state.kind === 'locating') && (
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<LocateFixed size={16} aria-hidden />}
            loading={state.kind === 'locating'}
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
