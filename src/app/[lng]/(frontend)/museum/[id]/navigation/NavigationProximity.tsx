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
  // A placed work never changes room: look each one up once per map, not on
  // every room change of the estimate.
  const roomOf = useMemo(
    () =>
      new Map(
        rooms.objects.map(({ objectId, point }) => [objectId, roomAt(rooms.rooms, point)?.id]),
      ),
    [rooms],
  )
  // Room-aware filtering avoids discoveries through walls: only works in the
  // same room as the estimate, or, when it falls outside every room (a
  // doorway, a corridor, GPS drift), only works outside every room too.
  // Maps without rooms use the geometric rule alone.
  const works = useMemo(
    () =>
      rooms.objects
        .filter(
          ({ objectId }) =>
            catalogById.has(objectId) &&
            (!rooms.rooms.length || roomOf.get(objectId) === room?.id) &&
            (objectId === nextId || (discoveries && !tourObjectIds.has(objectId))),
        )
        .map(({ objectId, point }) => ({ id: objectId, point }))
        // Prefer the requested destination when several works share one direction.
        .sort((a, b) => Number(b.id === nextId) - Number(a.id === nextId)),
    [rooms, roomOf, catalogById, room, nextId, discoveries, tourObjectIds],
  )
  const [seen, setSeen] = useState({
    key: scopeKey,
    ids: [] as string[],
    dismissed: [] as string[],
  })
  const previous = seen.key === scopeKey ? seen.ids : []
  // Recomputed only when a sensor reading or the candidate works change, not
  // on every re-render of the navigation around it.
  const ids = useMemo(
    () => nearbyWorks(point, heading, works, previous),
    [point, heading, works, previous],
  )
  // A dismissal lasts for the whole scope (until the confirmed position, GPS
  // source or destination changes): one jittery fix out of range must not
  // bring the same work back.
  const dismissed = seen.key === scopeKey ? seen.dismissed : []
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
      onDismiss={() =>
        setSeen({ key: scopeKey, ids, dismissed: [...new Set([...dismissed, ...ids])] })
      }
    />
  )
}
