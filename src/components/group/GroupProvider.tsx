'use client'

import { useLocalStorage } from '@mantine/hooks'
import type { Room } from 'livekit-client'
import dynamic from 'next/dynamic'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * Keeps this device's group tour connection (see `src/lib/group.ts`).
 * Mounted once in the frontend layout, so the LiveKit room stays connected
 * while the visitor moves between the waiting room, the map, its modals and
 * the quiz. Membership lives in localStorage: a reload or a reopened tab
 * reconnects, and the host key makes the host's device host again.
 *
 *   join/start → membership saved → GroupConnection (lazy) connects the room
 *   → it reports the room, the host's attributes and the room settings here
 *   → hooks below share them; GroupRoom gives LiveKit's own hooks the room
 *
 * This file imports nothing from LiveKit at runtime: it's in every frontend
 * page's bundle, and most visitors tour alone. `livekit-client` arrives with
 * GroupConnection, only once this device is in a group.
 */

const GroupConnection = dynamic(() => import('./GroupConnection'), { ssr: false })

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

/** From the room metadata the server wrote when the host opened the room. */
export type GroupSettings = { hostName: string; showResults: boolean }

export type GroupContextValue = {
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
  /** Null until GroupConnection has loaded, and while touring alone. */
  room: Room | null
  settings: GroupSettings | null
}

const GroupContext = createContext<GroupControls>({
  join: () => {},
  group: null,
  room: null,
  settings: null,
})

/** The current group, or null when this device is touring alone. */
export const useGroup = () => useContext(GroupContext).group
/** Joining or starting a group (join page, "Start with a group"). */
export const useJoinGroup = () => useContext(GroupContext).join
/** True for a guest: the host decides where the group goes. */
export const useIsGroupGuest = () => useGroup()?.membership.role === 'guest'
/** The group's LiveKit room, for GroupRoom. */
export const useGroupRoom = () => useContext(GroupContext).room

/** The host's name, and whether the host sees everyone's quiz score. */
export function useGroupSettings(): GroupSettings {
  const settings = useContext(GroupContext).settings
  return settings ?? { hostName: '', showResults: false }
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const [membership, setMembership] = useLocalStorage<GroupMembership | null>({
    key: 'aa-group',
    defaultValue: null,
  })
  const [host, setHost] = useState<Record<string, string>>({})
  const [room, setRoom] = useState<Room | null>(null)
  const [settings, setSettings] = useState<GroupSettings | null>(null)

  const group = useMemo<GroupContextValue | null>(() => {
    if (!membership) return null
    return {
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
    }
  }, [membership, host, setMembership])

  const value = useMemo<GroupControls>(
    () => ({ join: (next) => setMembership(next), group, room, settings }),
    [group, room, settings, setMembership],
  )

  return (
    <GroupContext.Provider value={value}>
      {children}
      {/* Beside the page, not around it: the page never remounts when LiveKit loads. */}
      {group && (
        <GroupConnection
          group={group}
          setMembership={setMembership}
          onRoom={setRoom}
          onHost={setHost}
          onSettings={setSettings}
        />
      )}
    </GroupContext.Provider>
  )
}
