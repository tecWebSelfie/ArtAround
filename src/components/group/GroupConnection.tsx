'use client'

import {
  followHref,
  groupLocation,
  HOST_IDENTITY,
  isQuizLocation,
  parseRoomMetadata,
} from '@/lib/group'
import {
  RoomContext,
  useConnectionState,
  useLocalParticipant,
  useParticipantAttributes,
  useRemoteParticipant,
  useRoomInfo,
  useSequentialRoomConnectDisconnect,
} from '@livekit/components-react'
import { notifications } from '@mantine/notifications'
import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  TokenSource,
  type Participant,
} from 'livekit-client'
import type { Route } from 'next'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GroupContextValue, GroupMembership, GroupSettings } from './GroupProvider'

/**
 * The LiveKit side of a group tour, split out of GroupProvider so that
 * `livekit-client` and `@livekit/components-react` are only downloaded by a
 * device that is in a group: GroupProvider (mounted in the frontend layout
 * for every page) loads this file with `next/dynamic` once it has a
 * membership, and renders it beside the page rather than around it, so the
 * page never remounts when the chunk arrives.
 *
 *   mount → new Room → TokenSource.endpoint('/api/rooms/token') → connect
 *   → reports the room, the host's attributes and the room settings up to
 *     GroupProvider, which shares them through its own React context
 *   → GroupSync: the host publishes where it is; guests follow it
 *
 * Unmounting (leaving, ending, switching groups) disconnects the room.
 */
export default function GroupConnection({
  group,
  setMembership,
  onRoom,
  onHost,
  onSettings,
}: {
  group: GroupContextValue
  setMembership: (membership: GroupMembership | null) => void
  onRoom: (room: Room | null) => void
  onHost: (attributes: Record<string, string>) => void
  onSettings: (settings: GroupSettings | null) => void
}) {
  const { t } = useTranslation('group')
  const [room] = useState(() => new Room())
  const { connect, disconnect } = useSequentialRoomConnectDisconnect(room)
  const { code, name, hostKey } = group.membership

  // Components that use LiveKit hooks get the room through GroupRoom.
  useEffect(() => {
    onRoom(room)
    return () => onRoom(null)
  }, [room, onRoom])

  // LiveKit's standard token endpoint; the headers say whether this device is the host.
  const tokenSource = useMemo(
    () =>
      TokenSource.endpoint('/api/rooms/token', {
        headers: { 'X-Guest-Id': deviceGuestId(), ...(hostKey ? { 'X-Host-Key': hostKey } : {}) },
      }),
    [hostKey],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { serverUrl, participantToken } = await tokenSource.fetch({
          roomName: code,
          participantName: name,
        })
        if (!cancelled) await connect(serverUrl, participantToken)
      } catch {
        // The host may have ended the group while this device was away.
        const open = await fetch(`/api/rooms/${code}`).then(
          (response) => response.ok,
          () => true,
        )
        if (!open && !cancelled) {
          setMembership(null)
          notifications.show({ title: t('This group has ended'), message: '' })
        }
      }
    })()
    return () => {
      cancelled = true
      void disconnect()
      onHost({})
    }
  }, [code, name, tokenSource, connect, disconnect, setMembership, onHost, t])

  // "End the group tour" deletes the room: every device leaves the group.
  // A plain listener: LiveKit's `useEvents` typings reject a `Room` emitter.
  useEffect(() => {
    const onDisconnected = (reason?: DisconnectReason) => {
      if (reason !== DisconnectReason.ROOM_DELETED) return
      setMembership(null)
      notifications.show({ title: t('The group tour has ended'), message: '' })
    }
    room.on(RoomEvent.Disconnected, onDisconnected)
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected)
    }
  }, [room, setMembership, t])

  return (
    <RoomContext.Provider value={room}>
      <SettingsWatcher onChange={onSettings} />
      <HostWatcher onChange={onHost} />
      {/* Reads the URL; its own Suspense keeps static pages static. */}
      <Suspense fallback={null}>
        <GroupSync group={group} />
      </Suspense>
    </RoomContext.Provider>
  )
}

/** A stable random id per device: a reload rejoins as the same guest. */
function deviceGuestId() {
  try {
    const saved = window.localStorage.getItem('aa-guest-id')
    if (saved) return saved
    const id = crypto.randomUUID()
    window.localStorage.setItem('aa-guest-id', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/**
 * The group's settings, from the room metadata the server wrote when the host
 * opened it: the host's name, and whether the host sees everyone's quiz score.
 */
function SettingsWatcher({ onChange }: { onChange: (settings: GroupSettings | null) => void }) {
  const { metadata } = useRoomInfo()
  useEffect(() => {
    const room = parseRoomMetadata(metadata)
    onChange(room ? { hostName: room.hostName, showResults: room.showResults } : null)
  }, [metadata, onChange])
  useEffect(() => () => onChange(null), [onChange])
  return null
}

/**
 * Remembers the host's attributes, so guests stay put while the host's device
 * is away. Two components because `useParticipantAttributes` needs a
 * participant, and the host may not be connected.
 */
function HostWatcher({ onChange }: { onChange: (attributes: Record<string, string>) => void }) {
  const host = useRemoteParticipant(HOST_IDENTITY)
  return host ? <HostAttributes participant={host} onChange={onChange} /> : null
}

function HostAttributes({
  participant,
  onChange,
}: {
  participant: Participant
  onChange: (attributes: Record<string, string>) => void
}) {
  const { attributes } = useParticipantAttributes({ participant })
  useEffect(() => {
    if (attributes) onChange({ ...attributes })
  }, [attributes, onChange])
  return null
}

/**
 * The host publishes where it is in the tour; each guest goes there.
 * Guests keep their own language, wheelchair route and reading choices
 * (`followHref`). Inside the group quiz, guests move freely between its
 * questions and their results.
 */
function GroupSync({ group }: { group: GroupContextValue }) {
  const pathname = usePathname()
  const search = useSearchParams()
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()
  const { localParticipant } = useLocalParticipant()
  const { membership, host } = group
  const location = groupLocation(pathname, search)
  const inTour = location.startsWith(`/tour/${membership.tourId}/`)
  const connected = useConnectionState() === ConnectionState.Connected

  useEffect(() => {
    if (membership.role !== 'host' || !membership.started || !connected || !inTour) return
    // Other pages (marketplace, account) don't move the group.
    void localParticipant.setAttributes({ path: location }).catch(() => {})
  }, [membership.role, membership.started, connected, inTour, location, localParticipant])

  // Saved attributes (`publish`) go out on every (re)connect and every change.
  const saved = membership.attributes
  useEffect(() => {
    if (connected && saved) void localParticipant.setAttributes(saved).catch(() => {})
  }, [connected, saved, localParticipant])

  const hostPath = host.path
  useEffect(() => {
    if (membership.role !== 'guest' || !hostPath || location === hostPath) return
    if (
      isQuizLocation(hostPath, membership.tourId) &&
      isQuizLocation(location, membership.tourId)
    ) {
      return
    }
    router.replace(followHref(hostPath, lng, pathname, search) as Route, { scroll: false })
  }, [membership.role, membership.tourId, hostPath, location, lng, pathname, search, router])

  return null
}
