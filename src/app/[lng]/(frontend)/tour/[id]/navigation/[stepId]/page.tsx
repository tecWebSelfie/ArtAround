import config from '@/payload.config'
import { getPayload } from 'payload'
import { TourNavigationPage } from './TourNavigation'

export default async function TourNavigationLayout({
  params,
}: PageProps<'/[lng]/tour/[id]/navigation/[stepId]'>) {
  const { id: tourId, stepId } = await params
  const payload = await getPayload({
    config,
  })
  const tour = await payload.findByID({
    collection: 'tours',
    id: tourId,
    joins: {
      museum: {
        limit: 1,
      },
    },
  })
  const museum = typeof tour.museum?.docs?.[0] === 'object' ? tour.museum?.docs?.[0] : null

  if (museum === null) {
    throw new Error('Museum not found for the tour')
  }

  return <TourNavigationPage tour={tour} step={parseInt(stepId)} museum={museum} />
}
