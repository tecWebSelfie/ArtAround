import i18nConfig from '@/../i18n.config'
import { getT } from '@/i18n.server'
import { asId } from '@/access/museumRoles'
import { normalizeLocale } from '@/lib/localized'
import { OBJECT_ID } from '@/lib/museum-cookie'
import { itemMuseums, printedCodeUrl, staffMuseumId } from '@/lib/qr-museum'
import { labelSheet, PRINT_QR_OPTIONS, singleSheet } from '@/lib/qr-sheet'
import { getSession } from '@/lib/session'
import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { z } from 'zod'

/**
 * GET `/api/qr-sheet?kind=…&id=…&lng=…&format=…`: the printable QR codes of a
 * tour, object or content (`format=pdf|svg|png`), or every object of a museum
 * (`kind=museum`, PDF labels), for the staff (curator or director) of the
 * museum the item belongs to (`itemMuseums`, the same rule the pages use to
 * show the downloads); everybody else gets 403.
 *
 * A plain GET, not a server action: the browser downloads it by itself
 * (`<a href download>`, `Content-Disposition`), it opens in a tab, works
 * without JavaScript and needs no client code to turn bytes into a file. The
 * printed URL is built only here (`printedCodeUrl`), with error correction Q.
 *
 * Every code carries `?museum=<id>` (`src/proxy.ts`): scanned on site, it opens
 * the app in that museum. PDF titles come in `lng`, the staff's language.
 */
export const runtime = 'nodejs'

const Query = z.object({
  kind: z.enum(['tour', 'object', 'content', 'museum']),
  id: z.string().regex(OBJECT_ID),
  lng: z.enum(i18nConfig.supportedLngs).catch(i18nConfig.fallbackLng),
  format: z.enum(['pdf', 'svg', 'png']).catch('pdf'),
})

function file(body: BodyInit, type: string, name: string) {
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${name}"`,
      // Staff-only and per-viewer: never cached by shared caches.
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function GET(request: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { kind, id, lng, format } = parsed.data
  const locale = normalizeLocale(lng) ?? 'en'
  // One session for the whole request: in a route handler `cache` does not
  // dedupe, and every `getSession` is an auth round-trip.
  const [{ payload, user }, { t }] = await Promise.all([getSession(), getT('common', { lng })])
  const viewer = { user, overrideAccess: false } as const
  const origin = request.nextUrl.origin
  const hint = t('Scan with your phone camera to open it in ArtAround.')
  const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    if (kind === 'museum') {
      const [staff, museum] = await Promise.all([
        staffMuseumId([id]),
        payload.findByID({
          collection: 'museums',
          id,
          depth: 0,
          select: { name: true, objects: true },
          ...viewer,
        }),
      ])
      if (staff !== id) return forbidden()
      const { docs } = await payload.find({
        collection: 'objects',
        where: { id: { in: (museum.objects ?? []).map(asId) } },
        depth: 0,
        pagination: false,
        sort: 'name',
        locale,
        select: { name: true },
        ...viewer,
      })
      const sheet = await labelSheet({
        museum: museum.name,
        hint,
        codes: docs.map((object) => ({
          url: printedCodeUrl(origin, `object/${object.id}`, id),
          title: object.name,
        })),
      })
      return file(
        new Uint8Array(await renderToBuffer(sheet)),
        'application/pdf',
        `artaround-museum-${id}.pdf`,
      )
    }

    const museums = await itemMuseums(kind, id, payload)
    const museumId = await staffMuseumId(museums.map((museum) => museum.id))
    if (!museumId) return forbidden()
    const url = printedCodeUrl(origin, `${kind}/${id}`, museumId)
    const name = `artaround-${kind}-${id}`

    if (format === 'svg') {
      return file(
        await QRCode.toString(url, { ...PRINT_QR_OPTIONS, type: 'svg' }),
        'image/svg+xml',
        `${name}.svg`,
      )
    }
    if (format === 'png') {
      // 1024px: ~860 dpi at 3 cm, plenty for print.
      const png = await QRCode.toBuffer(url, { ...PRINT_QR_OPTIONS, width: 1024 })
      return file(new Uint8Array(png), 'image/png', `${name}.png`)
    }

    const item =
      kind === 'tour'
        ? await payload.findByID({
            collection: 'tours',
            id,
            locale,
            select: { title: true },
            ...viewer,
          })
        : kind === 'object'
          ? await payload.findByID({
              collection: 'objects',
              id,
              locale,
              select: { name: true },
              ...viewer,
            })
          : await payload.findByID({
              collection: 'contents',
              id,
              locale,
              select: { title: true },
              ...viewer,
            })
    const title = 'title' in item ? item.title : item.name
    const sheet = await singleSheet({
      museum: museums.find((museum) => museum.id === museumId)?.name ?? '',
      hint,
      code: { url, title },
    })
    return file(new Uint8Array(await renderToBuffer(sheet)), 'application/pdf', `${name}.pdf`)
  } catch {
    // A missing or unreadable document (deleted, denied).
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
