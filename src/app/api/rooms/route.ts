import config from '@/payload.config'
import { GroupName, GroupRoomName } from '@/lib/group'
import { createGroupRoom, GroupNameTaken } from '@/lib/group-room'
import { asViewer } from '@/lib/session'
import { allowRequest } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

/**
 * "Start with a group": opens a room for a tour and returns its code and the
 * host key. The host's device keeps the key (GroupProvider) and uses it to
 * become host again after a reload or a dropped connection.
 */

const Body = z.object({
  tourId: z.string().min(1).max(64),
  name: GroupName,
  /** The easy name the host chose for the group; '' for a random code. */
  groupName: GroupRoomName.default(''),
  /** The host sees each guest's quiz score; off unless the host asks for it. */
  showResults: z.boolean().default(false),
})

export async function POST(request: Request) {
  if (!allowRequest(request, 10)) return NextResponse.json({ error: 'busy' }, { status: 429 })
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const payload = await getPayload({ config })
  // Read as the host: only someone who can read the tour (its author, for a
  // private one) can open a room for it, since the room's guests get the
  // group cookie that unlocks it (src/lib/visibility.ts).
  const tour = await payload
    .findByID({
      collection: 'tours',
      id: body.data.tourId,
      depth: 0,
      select: { title: true },
      ...(await asViewer()),
    })
    .catch(() => null)
  if (!tour) return NextResponse.json({ error: 'tour' }, { status: 404 })

  try {
    const room = await createGroupRoom(
      tour.id,
      body.data.name,
      body.data.showResults,
      body.data.groupName,
    )
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // Another open group has this name: the host picks a different one.
    if (error instanceof GroupNameTaken) {
      return NextResponse.json({ error: 'taken' }, { status: 409 })
    }
    console.error('Could not open a group room', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
