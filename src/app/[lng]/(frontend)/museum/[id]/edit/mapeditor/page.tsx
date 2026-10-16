import config from '@/payload.config'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { getPayload } from 'payload'
import { MapEditor } from './MapEditor'

export async function generateStaticParams() {
  const payload = await getPayload({
    config,
  })

  const museums = await payload.find({
    collection: 'museums',
    pagination: false,
    select: {},
  })

  return museums.docs.map((museum) => ({
    id: museum.id,
  }))
}

export default async function Map({ params }: PageProps<'/[lng]/museum/[id]/edit/mapeditor'>) {
  const { id: museumId } = await params

  const queryClient = new QueryClient()

  const payload = await getPayload({
    config,
  })

  await queryClient.query({
    queryKey: ['museum', museumId],
    queryFn: () =>
      payload.findByID({
        collection: 'museums',
        id: museumId,
      }),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MapEditor museumId={museumId} />
    </HydrationBoundary>
  )
}
