import NavigationPage from './NavigationPage'

import config from '@/payload.config'
import { getPayload } from 'payload'

export async function generateStaticPrams() {
  const payload = await getPayload({
    config,
  })
  return (
    await payload.find({
      collection: 'tours',
      limit: 0,
    })
  ).docs.map((tour) => tour.id)
}

export default async function NavigationStart({
  params,
}: PageProps<'/[lng]/tour/[id]/navigation'>) {
  const payload = await getPayload({
    config,
  })

  const tour = await payload.findByID({
    id: (await params).id,
    collection: 'tours',
  })

  return <NavigationPage tour={tour} />
}
