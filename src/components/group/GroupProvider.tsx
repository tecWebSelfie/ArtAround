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
  useEvents,
  useLocalParticipant,
  useParticipantAttributes,
  useRemoteParticipant,
  useRoomInfo,
  useSequentialRoomConnectDisconnect,
} from '@livekit/components-react'
import { useLocalStorage } from '@mantine/hooks'
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
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Keeps this device's group tour connection (see `src/lib/group.ts`).
 * Mounted once in the frontend layout, so the LiveKit room stays connected
 * while the visitor moves between the waiting room, the map, its modals and
 * the quiz. Membership lives in localStorage: a reload or a reopened tab
 * reconnects, and the host key makes the host's device host again.
 *
 *   join/start → TokenSource.endpoint('/api/rooms/token') → connect
 *   → LiveKit's React hooks read members and their attributes from RoomContext
 *   → GroupSync: the host publishes where it is; guests follow it
 *
 * The room is provided through LiveKit's own `RoomContext`, so any component
 * can use `@livekit/components-react` hooks (`useParticipants`, …) directly.
 * (It shadows the older voice-agent session's room below the layout; no
 * screen uses that one any more.)
 */

export type GroupMembership = {
  code: string
  tourId: string
  name: string
  role: 'host' | 'guest'
  /** Only on the host's device. */
  hostKey?: string
  /** Set by the host's "Start the tour"; before it the group waits in the room page. */
  started?: boolean
  /**
   * Attributes this device has published that must survive a reload (host:
   * `quiz`; guest: quiz progress and result). LiveKit attributes belong to a
   * connection, so GroupSync sends these again whenever the device connects.
   */
  attributes?: Record<string, string>
}

type GroupContextValue = {
  membership: GroupMembership
  /** The host's last known attributes (`path`, `quiz`), kept while its device is away. */
  host: Record<string, string>
  /** Publishes attributes to the group and keeps them for the next reconnect. */
  publish: (attributes: Record<string, string>) => void
  /** Host: lets the waiting group into the tour. */
  start: () => void
  leave: () => void
  /** Host: closes the room for everyone. */
  end: () => Promise<void>
}

type GroupControls = {
  join: (membership: GroupMembership) => void
  group: GroupContextValue | null
}

const GroupContext = createContext<GroupControls>({ join: () => {}, group: null })

/** The current group, or null when this device is touring alone. */
export const useGroup = () => useContext(GroupContext).group
/** Joining or starting a group (join page, "Start with a group"). */
export const useJoinGroup = () => useContext(GroupContext).join
/** True for a guest: the host decides where the group goes. */
export const useIsGroupGuest = () => useGroup()?.membership.role === 'guest'

/**
 * The group's settings, from the room metadata the server wrote when the host
 * opened it: the host's name, and whether the host sees everyone's quiz score.
 */
export function useGroupSettings() {
  const room = parseRoomMetadata(useRoomInfo().metadata)
  return { hostName: room?.hostName ?? '', showResults: room?.showResults ?? false }
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

export function GroupProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('group')
  const [membership, setMembership] = useLocalStorage<GroupMembership | null>({
    key: 'aa-group',
    defaultValue: null,
  })
  const [room] = useState(() => new Room())
  const { connect, disconnect } = useSequentialRoomConnectDisconnect(room)
  const [host, setHost] = useState<Record<string, string>>({})

  const code = membership?.code
  const name = membership?.name
  const hostKey = membership?.hostKey

  // LiveKit's standard token endpoint; the headers say whether this device is the host.
  const tokenSource = useMemo(
    () =>
      TokenSource.endpoint('/api/rooms/token', {
        headers: { 'X-Guest-Id': deviceGuestId(), ...(hostKey ? { 'X-Host-Key': hostKey } : {}) },
      }),
    [hostKey],
  )

  useEffect(() => {
    if (!code || !name) return
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
      setHost({})
    }
  }, [code, name, tokenSource, connect, disconnect, setMembership, t])

  // "End the group tour" deletes the room: every device leaves the group.
  useEvents(
    room,
    RoomEvent.Disconnected,
    (reason?: DisconnectReason) => {
      if (reason !== DisconnectReason.ROOM_DELETED) return
      setMembership(null)
      notifications.show({ title: t('The group tour has ended'), message: '' })
    },
    [setMembership, t],
  )

  const value = useMemo<GroupControls>(() => {
    const join = (next: GroupMembership) => setMembership(next)
    if (!membership) return { join, group: null }
    return {
      join,
      group: {
        membership,
        host,
        publish: (attributes) =>
          setMembership({
            ...membership,
            attributes: { ...membership.attributes, ...attributes },
          }),
        start: () => setMembership({ ...membership, started: true }),
        leave: () => setMembership(null),
        end: async () => {
          await fetch(`/api/rooms/${membership.code}`, {
            method: 'DELETE',
            headers: { 'X-Host-Key': membership.hostKey ?? '' },
          }).catch(() => {})
          setMembership(null)
        },
      },
    }
  }, [membership, host, setMembership])

  return (
    <RoomContext.Provider value={room}>
      <GroupContext.Provider value={value}>
        {children}
        {value.group && (
          <>
            <HostWatcher onChange={setHost} />
            {/* Reads the URL; its own Suspense keeps static pages static. */}
            <Suspense fallback={null}>
              <GroupSync group={value.group} />
            </Suspense>
          </>
        )}
      </GroupContext.Provider>
    </RoomContext.Provider>
  )
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
