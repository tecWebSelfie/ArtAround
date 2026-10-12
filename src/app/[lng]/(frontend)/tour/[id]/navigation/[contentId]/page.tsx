import config from '@/payload.config'
import { getPayload } from 'payload'
import { TourNavigation } from './TourNavigation'

export default async function TourNavigationLayout({
  params,
}: PageProps<'/[lng]/tour/[id]/navigation/[contentId]'>) {
  const { id: tourId, contentId: step } = await params
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

  return <TourNavigation tour={tour} step={parseInt(step)} />
}
