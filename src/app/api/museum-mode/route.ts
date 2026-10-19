import config from '@/payload.config'
import { MUSEUM_MODE_COOKIE } from '@/lib/museum-mode'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'

/**
 * Switches the app between global mode and one museum (see `museum-mode.ts`).
 *
 * POST `{ id, name }`: from the museum list (id only) or from an imported
 * config file (id and name). The museum is looked up by id first and by
 * exact name second, so a file exported from another database still works
 * when the museum exists here under the same name.
 * DELETE: back to global mode.
 */
export const runtime = 'nodejs'

const Body = z.object({
  id: z.string().max(64).nullable(),
  name: z.string().max(200).nullable(),
})

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { id, name } = parsed.data
  const payload = await getPayload({ config })
  const byId = id
    ? await payload
        .findByID({ collection: 'museums', id, depth: 0, select: { name: true } })
        .catch(() => null)
    : null
  const museum =
    byId ??
    (name
      ? (
          await payload.find({
            collection: 'museums',
            where: { name: { equals: name } },
            limit: 1,
            depth: 0,
            select: { name: true },
          })
        ).docs[0]
      : null)
  if (!museum) return NextResponse.json({ error: 'Museum not found' }, { status: 404 })

  const response = NextResponse.json({ id: museum.id, name: museum.name })
  response.cookies.set(MUSEUM_MODE_COOKIE, museum.id, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ id: null })
  response.cookies.delete(MUSEUM_MODE_COOKIE)
  return response
}
