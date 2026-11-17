'use client'

/**
 * PROTOTYPE (throwaway): `GroupConnection.tsx` + `GroupRoom.tsx` on Colyseus
 * instead of LiveKit, to compare size and complexity. Not mounted anywhere;
 * the server side is `src/lib/group-room.colyseus-prototype.ts`.
 *
 * Differences from the LiveKit version:
 * - `useRoom` connects (and reconnects after a drop, inside the SDK) and
 *   `useRoomState` gives the whole group state, so the token fetch, the retry
 *   loop, `SettingsWatcher`, `HostWatcher` and the attribute replay go away;
 * - quiz progress and requests are members' fields in the room state, so
 *   they survive a reload on the server, not in localStorage;
 * - the host leaves "End the group tour" to the room (`end` message).
 */
import { followHref, groupLocation, isQuizLocation, isTourLocation } from '@/lib/group'
import { addRequests, parseRequests, requestsInUrl, stopOfLocation } from '@/lib/group-requests'
import type { GroupState } from '@/lib/group-room.colyseus-prototype'
import { Client, type Room } from '@colyseus/sdk'
import { useRoom, useRoomMessage, useRoomState } from '@colyseus/react'
import { notifications } from '@mantine/notifications'
import type { Route } from 'next'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { GroupMembership } from './GroupProvider'

/**
 * Same origin in every environment: Next proxies `/colyseus` (HTTP and
 * WebSocket) to the group server it runs in-process (instrumentation.ts).
 * This file is loaded with `ssr: false`, so `location` exists.
 */
const client = new Client(`${location.origin}/colyseus`)
const GROUP_ENDED = 4001

type Membership = Omit<GroupMembership, 'attributes'> & { device: string; ticket?: string }

/** Connects this device's group room and reports it to GroupProvider. */
export default function GroupConnection({
  membership,
  setMembership,
  onRoom,
}: {
  membership: Membership
  setMembership: (membership: Membership | null) => void
  onRoom: (room: Room<GroupState> | undefined) => void
}) {
  const { t } = useTranslation('group')
  const { code, device, name, ticket } = membership
  const { room, error } = useRoom(
    () =>
      ticket && !membership.started
        ? client
            .create<GroupState>('group', { ticket, device, name })
            .catch(() => client.joinById<GroupState>(code, { ticket, device, name }))
        : client.joinById<GroupState>(code, { ticket, device, name }),
    [code, device, name, ticket],
  )

  useEffect(() => onRoom(room), [room, onRoom])

  useEffect(() => {
    if (!error) return
    setMembership(null)
    notifications.show({ title: t('This group has ended'), message: '' })
  }, [error, setMembership, t])

  // Private class visits: the room hands out the group cookie token; Next sets it httpOnly.
  useRoomMessage(room, 'groupCookie', (token: string) => {
    void fetch('/api/rooms/cookie', { method: 'POST', body: token })
  })

  useEffect(() => {
    if (!room) return
    const onLeave = (closeCode: number) => {
      if (closeCode !== GROUP_ENDED) return
      setMembership(null)
      notifications.show({ title: t('The group tour has ended'), message: '' })
    }
    room.onLeave(onLeave)
    return () => room.onLeave.remove(onLeave)
  }, [room, setMembership, t])

  return room ? (
    <Suspense fallback={null}>
      <GroupSync room={room} membership={membership} />
    </Suspense>
  ) : null
}

/** The host publishes where it is; guests follow it and publish their reading requests. */
function GroupSync({ room, membership }: { room: Room<GroupState>; membership: Membership }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const hostPath = useRoomState(room, (state) => state.path)
  const requests = useRoomState(room, (state) => state.members.get(membership.device)?.requests)
  const location = groupLocation(pathname, search)
  const inTour = isTourLocation(location, membership.tourId)
  const isHost = membership.role === 'host'

  useEffect(() => {
    if (isHost && membership.started && inTour) room.send('move', location)
  }, [isHost, membership.started, inTour, location, room])

  useEffect(() => {
    if (isHost || !inTour) return
    const stop = stopOfLocation(location)
    const kinds = requestsInUrl(search)
    if (stop === null || !kinds.length) return
    const next = addRequests(parseRequests(requests), kinds, stop, Date.now())
    if (next) room.send('me', { requests: JSON.stringify(next) })
  }, [isHost, inTour, location, search, requests, room])

  useEffect(() => {
    if (isHost || !hostPath || location === hostPath) return
    const inQuiz = (path: string) => isQuizLocation(path, membership.tourId)
    if (inQuiz(hostPath) && inQuiz(location)) return
    router.replace(followHref(hostPath, lng, pathname, search) as Route, { scroll: false })
  }, [isHost, membership.tourId, hostPath, location, lng, pathname, search, router])

  return null
}
