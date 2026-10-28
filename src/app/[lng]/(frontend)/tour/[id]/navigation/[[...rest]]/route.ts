import config from '@/payload.config'
import { getPayload } from 'payload'
import type { NextRequest } from 'next/server'
import { tourStartPath } from '@/lib/tour-navigation'

/**
 * Permanent redirect of the pre-phase-2 tour navigation URLs
 * (`/[lng]/tour/[id]/navigation[/...]`) to their museum-owned home
 * (`/[lng]/museum/[museumId]/navigation/tour/[id][/...]`, docs/tour-navigation.md).
 * Printed QR codes, shared links, bookmarks and a group host on an older
 * client still carry the old shape. A `next.config` redirect cannot know the
 * tour's museum, so this handler looks it up; the rest of the path (step,
 * `/open`, `/content/ID`, `/object/ID`, `/scan`) and the whole query (`at`,
 * `to`, `mobility`, …) are kept as they are.
 */
async function redirectToMuseumNavigation(
  request: NextRequest,
  { params }: RouteContext<'/[lng]/tour/[id]/navigation/[[...rest]]'>,
) {
  const { lng, id, rest = [] } = await params
  const payload = await getPayload({ config })
  const tour = await payload
    .findByID({ collection: 'tours', id, depth: 0, select: { museum: true } })
    .catch(() => null)
  const museumId = typeof tour?.museum === 'object' ? tour.museum?.id : tour?.museum
  if (!museumId) return new Response('Not found', { status: 404 })
  const suffix = rest.map((segment) => `/${encodeURIComponent(segment)}`).join('')
  // A relative Location keeps the visitor on the host they came from.
  return new Response(null, {
    status: 308,
    headers: { Location: `${tourStartPath(lng, museumId, id)}${suffix}${request.nextUrl.search}` },
  })
}

export const GET = redirectToMuseumNavigation
export const HEAD = redirectToMuseumNavigation
