import config from '@/payload.config'
import { getPayload } from 'payload'
import { cache } from 'react'
import type { NavigationTourSummary } from '@/app/[lng]/(frontend)/tour/[id]/navigation/TourNavigationShell'

/**
 * Server reads for free navigation (`/[lng]/museum/[id]/navigation`), shared
 * by the persistent shell and its modal slot. React.cache deduplicates them
 * within one request.
 */
export const getNavigationMuseum = cache(async (id: string, lng: string) => {
  const payload = await getPayload({ config })
  return payload.findByID({
    collection: 'museums',
    id,
    depth: 0,
    locale: lng as never,
    // Map, navmeshes and catalog index are public museum data.
    overrideAccess: true,
  })
})

/** The museum's tours, offered in the Spotlight as "start this tour". */
export const getMuseumTours = cache(
  async (museumId: string, lng: string): Promise<NavigationTourSummary[]> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'tours',
      where: { museum: { equals: museumId } },
      select: { title: true, contents: true },
      depth: 0,
      locale: lng as never,
      sort: 'title',
      pagination: false,
    })
    return docs
      .filter((tour) => (tour.contents?.length ?? 0) > 0)
      .map((tour) => ({ id: tour.id, title: tour.title, stops: tour.contents.length }))
  },
)
