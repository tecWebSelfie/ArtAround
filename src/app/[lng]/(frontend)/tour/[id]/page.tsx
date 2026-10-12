import config from '@/payload.config'
import { getPayload } from 'payload'
import TourPage from './TourPage'

export default async function Tour({ params }: PageProps<'/[lng]/tour/[id]'>) {
  const payload = await getPayload({
    config,
  })
  const tour = await payload.findByID({
    collection: 'tours',
    id: (await params).id, // Use the ID from the route parameters
  })

  return <TourPage tour={tour} />
}
