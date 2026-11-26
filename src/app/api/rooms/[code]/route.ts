import { ROOM_CODE_PATTERN } from '@/lib/group'
import { endGroupRoom, findGroupRoom, isHostKey } from '@/lib/group-room'
import { allowRequest } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

/**
 * One group room by its code.
 * - GET: whether it is still open (the join page and a device coming back
 *   after a while ask this), and for which tour.
 * - DELETE: "End the group tour"; only the host key can close it for everyone.
 */

export async function GET(request: Request, { params }: RouteContext<'/api/rooms/[code]'>) {
  // The code is the only secret of a room, so this answer is a guessing oracle:
  // one budget per client for ALL codes (a fixed bucket, not the per-code path).
  // Legit callers ask once in a while (the join page, a device whose token
  // request failed), well under 30 a minute.
  if (!allowRequest(request, 30, '/api/rooms/[code]')) {
    return NextResponse.json({ error: 'busy' }, { status: 429 })
  }
  const { code } = await params
  const room = ROOM_CODE_PATTERN.test(code) ? await findGroupRoom(code) : null
  if (!room) return NextResponse.json({ error: 'ended' }, { status: 404 })
  return NextResponse.json({
    tourId: room.tourId,
    hostName: room.hostName,
    showResults: room.showResults,
  })
}

export async function DELETE(request: Request, { params }: RouteContext<'/api/rooms/[code]'>) {
  const { code } = await params
  if (!ROOM_CODE_PATTERN.test(code)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const room = await findGroupRoom(code)
  if (!room) return new NextResponse(null, { status: 204 })
  if (!isHostKey(room, request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  await endGroupRoom(code)
  return new NextResponse(null, { status: 204 })
}
