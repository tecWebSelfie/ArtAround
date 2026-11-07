'use client'

import { useMemo, useState } from 'react'
import type { PolygonPoint2D } from '@pascal-app/core'
import { roomAt, type MuseumRooms } from '@/lib/museum-rooms'
import { nearbyWorks } from '@/lib/proximity-works'
import type { NavigationCatalogObject } from '@/lib/tour-navigation'
import { NearbyWorksNotice } from './NearbyWorksNotice'

/** Sensor suggestions never navigate on their own or write GPS coordinates to the URL. */
export function NavigationProximity({
  point,
  heading,
  rooms,
  catalog,
  nextId,
  tourObjectIds,
  discoveries,
  scopeKey,
  onOpen,
  onConfirm,
}: {
  point: PolygonPoint2D | null
  heading: number | null
  rooms: MuseumRooms
  catalog: NavigationCatalogObject[]
  nextId: string | null
  tourObjectIds: ReadonlySet<string>
  discoveries: boolean
  scopeKey: string
  onOpen: (id: string) => void
  onConfirm: (id: string) => void
}) {
  const room = point ? roomAt(rooms.rooms, point) : null
  const catalogById = useMemo(() => new Map(catalog.map((work) => [work.id, work])), [catalog])
  // Room-aware filtering avoids discoveries through walls. In maps without
  // named rooms, use the same geometric rule as the rest of route guidance.
  const works = useMemo(
    () =>
      rooms.objects
        .filter(
          ({ objectId, point: placed }) =>
            catalogById.has(objectId) &&
            (!room || roomAt(rooms.rooms, placed)?.id === room.id) &&
            (objectId === nextId || (discoveries && !tourObjectIds.has(objectId))),
        )
        .map(({ objectId, point }) => ({ id: objectId, point }))
        // Prefer the requested destination when several works share one direction.
        .sort((a, b) => Number(b.id === nextId) - Number(a.id === nextId)),
    [rooms, catalogById, room, nextId, discoveries, tourObjectIds],
  )
  const [seen, setSeen] = useState({
    key: scopeKey,
    ids: [] as string[],
    dismissed: [] as string[],
  })
  const previous = seen.key === scopeKey ? seen.ids : []
  const ids = nearbyWorks(point, heading, works, previous)
  const dismissed = seen.key === scopeKey ? seen.dismissed.filter((id) => ids.includes(id)) : []
  // State follows sensor inputs during render, so a stale suggestion is never
  // displayed for one frame after GPS is disabled, or the museum changes.
  if (
    seen.key !== scopeKey ||
    ids.join() !== seen.ids.join() ||
    dismissed.join() !== seen.dismissed.join()
  ) {
    setSeen({ key: scopeKey, ids, dismissed })
  }
  const visible = ids
    .filter((id) => !dismissed.includes(id))
    .flatMap((id) => {
      const work = catalogById.get(id)
      return work ? [{ ...work, next: id === nextId }] : []
    })
  return (
    <NearbyWorksNotice
      works={visible}
      onOpen={onOpen}
      onConfirm={onConfirm}
      onDismiss={() => setSeen({ key: scopeKey, ids, dismissed: ids })}
    />
  )
}
