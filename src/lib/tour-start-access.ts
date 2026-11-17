import 'server-only'

import type { Content, Tour } from '@/payload-types'
import { asViewer, can } from '@/lib/session'
import { isLocked } from '@/lib/price'
import { withVisitableStops } from '@/lib/tour-summary'
import { canStartPaidTour } from './tour-start-policy'
import type { Payload } from 'payload'

/** `visitableContents`, when read, narrows the stops to the visitable ones. */
type TourStops = Pick<Tour, 'id' | 'contents' | 'visitableContents'>
type StopReference = string | Pick<Content, 'id'>

type TourPrice = {
  lockedPrice: number
  stopsResolved: boolean
}

/**
 * Resolves paid-stop access on the server only. Payload's body-field access is
 * the source of truth for ownership; no client-provided purchase claim is used.
 * Only visitable stops count (`withVisitableStops`): navigation never shows the
 * others, so a paid stop that left the map must not lock the tour.
 */
async function lockedPricesForTours(payload: Payload, read: readonly TourStops[]) {
  const tours = read.map(withVisitableStops)
  const ids = [
    ...new Set(
      tours.flatMap((tour) =>
        (tour.contents ?? []).map((stop: StopReference) =>
          typeof stop === 'string' ? stop : String(stop.id),
        ),
      ),
    ),
  ]
  const lockedPrices = new Map<string, number>()

  if (ids.length > 0) {
    const { docs } = await payload.find({
      collection: 'contents',
      where: { id: { in: ids } },
      depth: 0,
      pagination: false,
      select: { price: true, body: true },
      // A withheld body means the visitor has not bought this paid stop.
      ...(await asViewer()),
    })
    for (const content of docs) {
      lockedPrices.set(String(content.id), isLocked(content) ? (content.price ?? 0) : 0)
    }
  }

  return new Map<string, TourPrice>(
    tours.map((tour) => {
      const stopIds = (tour.contents ?? []).map((stop: StopReference) =>
        typeof stop === 'string' ? stop : String(stop.id),
      )
      return [
        String(tour.id),
        {
          lockedPrice: stopIds.reduce((sum, id) => sum + (lockedPrices.get(id) ?? 0), 0),
          // A missing stop record must not turn an incomplete read into a free tour.
          stopsResolved: stopIds.every((id) => lockedPrices.has(id)),
        },
      ]
    }),
  )
}

/** Computes one visitor's start permission from the same field access as tour pages. */
export async function getTourStartAccess(
  payload: Payload,
  tourId: string,
  contents: Tour['contents'],
) {
  const access = (await lockedPricesForTours(payload, [{ id: tourId, contents }])).get(tourId)
  const lockedPrice = access?.lockedPrice ?? 0
  const canEdit =
    access?.stopsResolved && lockedPrice > 0 ? await can('tours', tourId, 'update') : false

  return {
    lockedPrice,
    canStart: Boolean(access?.stopsResolved) && canStartPaidTour(lockedPrice, canEdit),
  }
}

/** Reads only the stop IDs needed for the room page, never populated paid bodies. */
export async function getTourStartAccessById(payload: Payload, tourId: string) {
  const tour = await payload
    .findByID({
      collection: 'tours',
      id: tourId,
      depth: 0,
      select: { contents: true, visitableContents: true },
      ...(await asViewer()),
    })
    .catch(() => null)
  if (!tour) return { lockedPrice: 0, canStart: false }
  return getTourStartAccess(payload, tour.id, withVisitableStops(tour).contents)
}

/** Batch-checks museum tour pills so unowned paid tours never become map commands. */
export async function getStartableTourIds(payload: Payload, tours: readonly TourStops[]) {
  const prices = await lockedPricesForTours(payload, tours)
  const candidates = tours.filter((tour) => prices.get(String(tour.id))?.stopsResolved)
  const allowed = await Promise.all(
    candidates.map(async (tour) => {
      const lockedPrice = prices.get(String(tour.id))?.lockedPrice ?? 0
      const canEdit = lockedPrice > 0 ? await can('tours', String(tour.id), 'update') : false
      return canStartPaidTour(lockedPrice, canEdit) ? String(tour.id) : null
    }),
  )
  return new Set(allowed.filter((id): id is string => id !== null))
}
