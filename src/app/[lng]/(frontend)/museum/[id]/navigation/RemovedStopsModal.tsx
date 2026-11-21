'use client'

import { useIsGroupGuest } from '@/components/group/GroupProvider'
import { createSessionStore } from '@/lib/session-store'
import { tourMuseumId, tourNavigationPath } from '@/lib/tour-navigation'
import type { Tour } from '@/payload-types'
import { Button, List, Modal, Stack, Text, ThemeIcon } from '@mantine/core'
import { MapPinOff } from 'lucide-react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Tells a visitor which stops left their tour while they were following it.
 *
 * The server hands navigation only the visitable stops (`visitableTour`), and
 * the URL cursor counts completed stops of that list. When a stop stops being
 * visitable mid-visit (its work leaves the map, its content is deleted or made
 * private), the list shrinks on the next server render and, without this, the
 * same cursor would silently point one stop further. So the tab remembers the
 * last list it showed (sessionStorage, per tour): when stops are gone it names
 * them, and whoever leads (a visitor on their own or a group's host) moves the
 * cursor back onto the stop they were heading to. Guests only read it: the
 * host's corrected cursor moves them along (Follow-the-Host).
 */

type SeenStop = { id: string; title: string }

const store = createSessionStore<SeenStop[] | null>((stored) =>
  Array.isArray(stored)
    ? stored.filter(
        (stop): stop is SeenStop => typeof stop?.id === 'string' && typeof stop?.title === 'string',
      )
    : null,
)

const storeKey = (tourId: string) => `artaround:tour-stops:${tourId}`

const stopsOf = (tour: Tour): SeenStop[] =>
  tour.contents.map((stop) =>
    typeof stop === 'string' ? { id: stop, title: '' } : { id: stop.id, title: stop.title },
  )

/**
 * The cursor on the new list for a visitor who was at `step` on the old one:
 * the index of the stop they were heading to, or of the first later one still
 * there; the end (tour completed) when none is left.
 */
export function remapStep(previous: SeenStop[], current: SeenStop[], step: number) {
  const index = new Map(current.map((stop, position) => [stop.id, position]))
  for (const stop of previous.slice(step)) {
    const position = index.get(stop.id)
    if (position !== undefined) return position
  }
  return current.length
}

export function RemovedStopsModal({ tour, step }: { tour: Tour; step: number }) {
  const { t } = useTranslation('tour-navigation')
  const { lng } = useParams<{ lng: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const guest = useIsGroupGuest()
  const key = storeKey(tour.id)
  const seen = store.useValue(key)
  const current = stopsOf(tour)
  const currentIds = new Set(current.map((stop) => stop.id))
  const removed = (seen ?? []).filter((stop) => !currentIds.has(stop.id))
  const changed = seen !== null && seen.map((stop) => stop.id).join() !== [...currentIds].join()

  // Commits the list the visitor now follows and, for whoever leads, puts the
  // cursor back on the stop they were heading to.
  const acknowledge = () => {
    const next = seen ? remapStep(seen, current, step) : step
    store.save(key, current)
    if (!guest && next !== step) {
      const path = tourNavigationPath(lng, tourMuseumId(tour), tour.id, next)
      const query = search.toString()
      router.replace(`${path}${query ? `?${query}` : ''}` as typeof path)
    }
  }

  // First visit in this tab: remember the list. A list that only gained stops
  // (one visitable again) needs no notice, just the same cursor fix.
  useEffect(() => {
    if (seen === null) store.save(key, current)
    else if (changed && removed.length === 0) acknowledge()
  })

  if (removed.length === 0) return null
  return (
    <Modal
      opened
      onClose={acknowledge}
      centered
      title={t('Some stops are no longer part of this tour', { count: removed.length })}
    >
      <Stack gap="md">
        <ThemeIcon size={48} radius="xl" variant="light" color="gray" aria-hidden>
          <MapPinOff size={24} />
        </ThemeIcon>
        <Text size="sm">
          {t('These stops can no longer be visited, so the tour goes on without them', {
            count: removed.length,
          })}
        </Text>
        <List size="sm" spacing={4}>
          {removed.map((stop) => (
            <List.Item key={stop.id}>
              <Text span size="sm" fw={500}>
                {stop.title || t('A stop that no longer exists')}
              </Text>
            </List.Item>
          ))}
        </List>
        {guest && (
          <Text size="sm" c="dimmed">
            {t('Your guide will lead you on')}
          </Text>
        )}
        <Button onClick={acknowledge}>{t('Continue the tour')}</Button>
      </Stack>
    </Modal>
  )
}
