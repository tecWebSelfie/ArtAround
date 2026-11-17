/**
 * PROTOTYPE (throwaway): `POST /api/rooms` on Colyseus. Same access checks as
 * `route.ts`; instead of creating a LiveKit room it signs a host ticket, and
 * the host's device creates the Colyseus room with it (the room refuses a
 * code already open). Not a route file, so Next ignores it.
 */
import config from '@/payload.config'
import { GroupName, GroupRoomName, normalizeRoomCode, ROOM_CODE_ALPHABET } from '@/lib/group'
import { signHostTicket } from '@/lib/group-room.colyseus-prototype'
import { asViewer } from '@/lib/session'
import { hasNoStopsToVisit } from '@/lib/tour-stops'
import { allowRequest } from '@/lib/rate-limit'
import { getTourStartAccess } from '@/lib/tour-start-access'
import { withVisitableStops } from '@/lib/tour-summary'
import { NextResponse } from 'next/server'
import { randomInt } from 'node:crypto'
import { getPayload } from 'payload'
import { z } from 'zod'

const Body = z.object({
  tourId: z.string().min(1).max(64),
  name: GroupName,
  groupName: GroupRoomName.default(''),
  showResults: z.boolean().default(false),
})

const randomCode = () =>
  Array.from({ length: 6 }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('')

export async function POST(request: Request) {
  if (!allowRequest(request, 10)) return NextResponse.json({ error: 'busy' }, { status: 429 })
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const payload = await getPayload({ config })
  const tour = await payload
    .findByID({
      collection: 'tours',
      id: body.data.tourId,
      depth: 0,
      select: { contents: true, visitableContents: true, visitableStops: true },
      ...(await asViewer()),
    })
    .catch(() => null)
  if (!tour) return NextResponse.json({ error: 'tour' }, { status: 404 })
  if (hasNoStopsToVisit(tour)) return NextResponse.json({ error: 'empty' }, { status: 422 })
  const access = await getTourStartAccess(payload, tour.id, withVisitableStops(tour).contents)
  if (!access.canStart) return NextResponse.json({ error: 'locked' }, { status: 403 })

  const code = normalizeRoomCode(body.data.groupName) || randomCode()
  const ticket = await signHostTicket({
    code,
    tourId: tour.id,
    hostName: body.data.name,
    groupName: body.data.groupName,
    showResults: body.data.showResults,
  })
  return NextResponse.json({ code, ticket }, { headers: { 'Cache-Control': 'no-store' } })
}
