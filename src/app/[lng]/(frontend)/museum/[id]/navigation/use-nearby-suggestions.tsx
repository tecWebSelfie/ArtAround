'use client'

import { LockedPriceBadge } from '@/components/mantine/LockedPriceBadge'
import type { MuseumRooms } from '@/lib/museum-rooms'
import { nearbySuggestions, type NearbySuggestion } from '@/lib/nearby-suggestions'
import type { NavigationCatalogObject } from '@/lib/tour-navigation'
import { Button, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { PolygonPoint2D } from '@pascal-app/core'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** One suggestion notification at a time; a newer room replaces it. */
const NOTIFICATION_ID = 'nearby-suggestion'
/** Long enough to read and act; missed ones stay in the Spotlight "Nearby" pills. */
const NOTIFICATION_MS = 12_000

/**
 * When the visitor enters a room (confirmed position or GPS estimate), shows a
 * notification for an off-tour content of an object in that room, with "Open"
 * and "Go there". Each content is suggested once per visit, and every
 * suggestion is also kept in a list for the Spotlight "Nearby" pills.
 */
export function useNearbySuggestions({
  enabled,
  rooms,
  point,
  catalog,
  tourContentIds,
  onOpen,
  onGo,
}: {
  enabled: boolean
  rooms: MuseumRooms
  point: PolygonPoint2D | null
  catalog: NavigationCatalogObject[]
  tourContentIds: ReadonlySet<string>
  onOpen: (suggestion: NearbySuggestion) => void
  onGo: (suggestion: NearbySuggestion) => void
}) {
  const { t } = useTranslation('tour-navigation')
  const suggested = useRef(new Set<string>())
  const [history, setHistory] = useState<NearbySuggestion[]>([])
  const roomRef = useRef<string | null>(null)
  // Refs keep the latest handlers without re-running the room check. Updated
  // after each commit (refs must not be written during render); the
  // notification buttons only read them later, on click.
  const handlers = useRef({ onOpen, onGo })
  useEffect(() => {
    handlers.current = { onOpen, onGo }
  })

  useEffect(() => {
    if (!enabled) return
    const { room, suggestions } = nearbySuggestions({
      map: rooms,
      point,
      catalog,
      tourContentIds,
      alreadySuggested: suggested.current,
    })
    // Only a change of room triggers suggestions, so GPS jitter inside a room
    // (or the same position re-rendering) never repeats them.
    if (room === roomRef.current) return
    roomRef.current = room
    if (!suggestions.length) return
    for (const suggestion of suggestions) suggested.current.add(suggestion.content.id)
    setHistory((previous) => [...suggestions, ...previous])

    const [first] = suggestions
    notifications.hide(NOTIFICATION_ID)
    notifications.show({
      id: NOTIFICATION_ID,
      position: 'top-center',
      autoClose: NOTIFICATION_MS,
      title: t('Nearby in {{room}}', { room: first.room }),
      message: (
        <Stack gap={6}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600} lineClamp={2}>
              {first.content.title}
            </Text>
            {first.content.locked && first.content.price ? (
              <LockedPriceBadge price={first.content.price} size="sm" />
            ) : null}
          </Group>
          <Text size="xs" c="dimmed">
            {first.object.name}
          </Text>
          <Group gap="xs">
            <Button
              size="compact-sm"
              onClick={() => {
                notifications.hide(NOTIFICATION_ID)
                handlers.current.onOpen(first)
              }}
            >
              {t('Open')}
            </Button>
            <Button
              size="compact-sm"
              variant="default"
              onClick={() => {
                notifications.hide(NOTIFICATION_ID)
                handlers.current.onGo(first)
              }}
            >
              {t('Go there')}
            </Button>
          </Group>
        </Stack>
      ),
    })
  }, [enabled, rooms, point, catalog, tourContentIds, t])

  return history
}
