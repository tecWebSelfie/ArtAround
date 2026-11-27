import { getTourEditorData } from '@/app/[lng]/(frontend)/tour/tour-editing'
import { allowRequest } from '@/lib/rate-limit'
import { asViewer, getSession } from '@/lib/session'
import { anonymousCopyStops, copiedDirections } from '@/lib/tour-copy'
import { NextResponse } from 'next/server'
import { extractID } from 'payload/shared'
import { z } from 'zod'

/**
 * "Customize tour" for a visitor who is not signed in: saves their copy of a
 * tour with the stops they chose (`TourForm` in anonymous mode, opened by
 * `/tour/new?from=<id>`). Signed-in visitors save their copies through REST
 * as before, owned and private; an anonymous visitor can't own a tour, so
 * this route writes it for them, like `/api/plan-tour` writes a planned
 * visit: no author, public but never listed or searched (`visitCopyOf`,
 * `LISTED_TOURS`), reachable by its link only.
 *
 * Access stays the visitor's: the original is read as them (a private tour
 * is not found), and every stop must be one the editor offered them (a
 * public content of a work on the museum map). Only the stops, their order
 * and the start entrance come from the body: the title, description and
 * practical information are the original's, so an anonymous request can't
 * publish its own text under the app's domain. The collection hooks still
 * run (contents guard, start entrance, visitable stops).
 */
export const runtime = 'nodejs'

const CopyRequest = z.object({
  from: z.string().min(1).max(64),
  contents: z.array(z.string().min(1).max(64)).min(1).max(100),
  startEntrance: z.string().max(128).nullable().optional(),
})

export async function POST(request: Request) {
  if (!allowRequest(request, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const parsed = CopyRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data
  const { payload, user } = await getSession()
  // A signed-in visitor's copy is theirs, private, saved through REST.
  if (user) return NextResponse.json({ error: 'Signed in' }, { status: 409 })

  const source = await payload
    .findByID({ collection: 'tours', id: body.from, depth: 0, ...(await asViewer()) })
    .catch(() => null)
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const museumId = extractID(source.museum)
  const { candidates } = await getTourEditorData(museumId)
  const stops = anonymousCopyStops(body.contents, candidates)
  if (!stops) return NextResponse.json({ error: 'Invalid stops' }, { status: 400 })

  try {
    // The original's notes for the kept stops, in the copy's visiting order.
    const directions = copiedDirections(source, stops)
    const tour = await payload.create({
      collection: 'tours',
      data: {
        title: source.title,
        description: source.description ?? null,
        logistics: source.logistics ?? null,
        // Checked against the museum's placed entrances (`checkStartEntrance`).
        startEntrance: body.startEntrance || null,
        directions: stops.flatMap((content) =>
          directions[content] ? [{ content, text: directions[content] }] : [],
        ),
        contents: stops,
        museum: museumId,
        thumbnail: source.thumbnail ? extractID(source.thumbnail) : null,
        visitCopyOf: source.id,
        // No author: `keepVisitCopyPrivate` leaves it public (see above).
        visibility: 'public',
      },
    })
    return NextResponse.json({ id: tour.id, museumId })
  } catch (error) {
    // The collection's own validation (a start entrance no longer placed, …).
    console.error('Anonymous tour copy failed', error)
    return NextResponse.json({ error: 'Invalid copy' }, { status: 400 })
  }
}
