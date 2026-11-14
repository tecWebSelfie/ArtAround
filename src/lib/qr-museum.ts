import 'server-only'

import { lockedMuseumId } from '@/lib/museum-mode'
import { can, getSession } from '@/lib/session'
import { contentObjectId, tourMuseumId } from '@/lib/tour-navigation'
import { cache } from 'react'
import type { Payload } from 'payload'

/**
 * Which museum a tour, object or content belongs to, and what that means on
 * its page (`museumAffordances`) and for its printable codes
 * (`/api/qr-sheet`): one rule, so the button a page shows and the access the
 * route enforces always agree.
 *
 * - A tour belongs to its museum.
 * - An object to every museum whose map places it (`objects.museums`, the join
 *   over `museums.objects`).
 * - A content to the museums of its object (its first one, as everywhere else:
 *   `contentObjectId`).
 */
export type QrKind = 'tour' | 'object' | 'content'

export type ItemMuseum = { id: string; name: string }

async function objectMuseums(payload: Payload, objectId: string): Promise<ItemMuseum[]> {
  const object = await payload.findByID({
    collection: 'objects',
    id: objectId,
    depth: 1,
    select: { museums: true },
    populate: { museums: { name: true } },
  })
  return (object.museums?.docs ?? []).flatMap((museum) =>
    typeof museum === 'object' ? [{ id: museum.id, name: museum.name }] : [],
  )
}

/**
 * The item's museums (empty when it has none, or can't be read). Takes the
 * Payload instance from the caller when it has one (a route handler, where
 * `cache` does not dedupe and each `getSession` is a new auth round-trip).
 */
export const itemMuseums = cache(async function itemMuseums(
  kind: QrKind,
  id: string,
  payload?: Payload,
): Promise<ItemMuseum[]> {
  const local = payload ?? (await getSession()).payload
  try {
    if (kind === 'tour') {
      const tour = await local.findByID({
        collection: 'tours',
        id,
        depth: 1,
        select: { museum: true },
        populate: { museums: { name: true } },
      })
      return [
        {
          id: tourMuseumId(tour),
          name: typeof tour.museum === 'object' ? tour.museum.name : '',
        },
      ]
    }
    if (kind === 'object') return await objectMuseums(local, id)
    const content = await local.findByID({
      collection: 'contents',
      id,
      depth: 0,
      select: { objects: true },
    })
    const objectId = contentObjectId(content)
    return objectId ? await objectMuseums(local, objectId) : []
  } catch {
    return []
  }
})

/**
 * Printed QR codes are for the staff of the museum that shows the item: they
 * download a code that opens the app in their museum (`?museum=<id>`, handled
 * by `src/proxy.ts`). This returns that museum, the first of `museumIds` where
 * the visitor is curator or director (the same right as editing its map), or
 * `null` for everybody else, who only sees the code on screen.
 */
export async function staffMuseumId(museumIds: readonly string[]): Promise<string | null> {
  const allowed = await Promise.all(museumIds.map((id) => can('museums', id, 'update', 'map')))
  return museumIds[allowed.indexOf(true)] ?? null
}

/**
 * What an item's page offers around its museum:
 * - `printMuseumId`: the staff's museum, which enables the printable codes in
 *   `QrCodeButton`;
 * - `offer`: the museum to propose (`MuseumModeOffer`) when the app is not
 *   locked to it yet;
 * - `museumId`: the item's (first) museum, the parent its back button opens.
 */
export async function museumAffordances(kind: QrKind, id: string) {
  const museums = await itemMuseums(kind, id)
  const [printMuseumId, locked] = await Promise.all([
    staffMuseumId(museums.map((museum) => museum.id)),
    lockedMuseumId(),
  ])
  const [first] = museums
  return {
    printMuseumId,
    offer: first && first.id !== locked ? first : null,
    museumId: first?.id ?? null,
  }
}

/**
 * The URL a printed code carries: language-free (the i18n proxy picks the
 * visitor's language) and ending with the museum (`src/proxy.ts`).
 */
export const printedCodeUrl = (origin: string, path: string, museumId: string) =>
  `${origin}/${path}?museum=${museumId}`
