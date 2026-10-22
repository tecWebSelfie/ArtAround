import { GroupName, HOST_IDENTITY, ROOM_CODE_PATTERN } from '@/lib/group'
import { findGroupRoom, groupToken, isHostKey } from '@/lib/group-room'
import { allowRequest } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Token endpoint for group rooms, in LiveKit's standard endpoint format so the
 * browser uses `TokenSource.endpoint` (GroupProvider): the request body names
 * the room (the group code) and the participant; the response has
 * `server_url` and `participant_token`.
 *
 * Two headers say who is joining: `X-Host-Key` (only the host's device has
 * it) joins as the host; otherwise `X-Guest-Id`, a random id the device keeps,
 * so a reload is the same guest rather than a new one.
 */

const Body = z.object({
  room_name: z.string().regex(ROOM_CODE_PATTERN),
  participant_name: GroupName,
})
const GuestId = z.string().regex(/^[\w-]{8,64}$/)

export async function POST(request: Request) {
  if (!allowRequest(request, 30)) return NextResponse.json({ error: 'busy' }, { status: 429 })
  const body = Body.safeParse(await request.json().catch(() => null))
  const guestId = GuestId.safeParse(request.headers.get('X-Guest-Id'))
  if (!body.success || !guestId.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const code = body.data.room_name
  try {
    const room = await findGroupRoom(code)
    if (!room) return NextResponse.json({ error: 'ended' }, { status: 404 })
    const host = isHostKey(room, request)
    const { serverUrl, token } = await groupToken(code, {
      identity: host ? HOST_IDENTITY : `guest-${guestId.data}`,
      name: body.data.participant_name,
    })
    return NextResponse.json(
      { server_url: serverUrl, participant_token: token },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Could not join a group room', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
