'use client'

import { RoomContext } from '@livekit/components-react'
import type { ReactNode } from 'react'
import { useGroupRoom } from './GroupProvider'

/**
 * Gives `@livekit/components-react` hooks (`useParticipants`,
 * `useConnectionState`, …) the group's room. GroupProvider no longer wraps
 * every page in LiveKit's RoomContext (that would put LiveKit in every page's
 * bundle), so the group-only UI that reads the room wraps itself in this.
 * Renders `fallback` until the lazily loaded GroupConnection has created the room.
 */
export function GroupRoom({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const room = useGroupRoom()
  return room ? <RoomContext.Provider value={room}>{children}</RoomContext.Provider> : fallback
}
