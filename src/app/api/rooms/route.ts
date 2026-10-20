import config from '@/payload.config'
import { GroupName } from '@/lib/group'
import { createGroupRoom } from '@/lib/group-room'
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
  /** The host sees each guest's quiz score; off unless the host asks for it. */
  showResults: z.boolean().default(false),
})

export async function POST(request: Request) {
  if (!allowRequest(request, 10)) return NextResponse.json({ error: 'busy' }, { status: 429 })
  const body = Body.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const payload = await getPayload({ config })
  const tour = await payload
    .findByID({ collection: 'tours', id: body.data.tourId, depth: 0, select: { title: true } })
    .catch(() => null)
  if (!tour) return NextResponse.json({ error: 'tour' }, { status: 404 })

  try {
    const room = await createGroupRoom(tour.id, body.data.name, body.data.showResults)
    return NextResponse.json(room, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Could not open a group room', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
