import config from '@/payload.config'
import { getPayload } from 'payload'
import type { NextRequest } from 'next/server'
import { asViewer } from '@/lib/session'
import { tourMuseumId, tourStartPath } from '@/lib/tour-navigation'
import i18nConfig from '@/../i18n.config'

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
  // `lng` goes straight into `Location`, and the i18n proxy skips paths with a
  // dot, so it can be `/evil.com` or `\\evil.com` (a protocol-relative open
  // redirect). Only a supported language is a real legacy URL.
  if (!(i18nConfig.supportedLngs as readonly string[]).includes(lng))
    return new Response('Not found', { status: 404 })
  const payload = await getPayload({ config })
  // Read as the visitor (cookie user, `readTours`): a private tour they may not
  // read answers 404 exactly like an unknown id, so neither its existence nor
  // its museum leaks; its author still gets the redirect.
  const tour = await payload
    .findByID({
      collection: 'tours',
      id,
      depth: 0,
      select: { museum: true },
      ...(await asViewer()),
    })
    .catch(() => null)
  const museumId = tour && tourMuseumId(tour)
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
