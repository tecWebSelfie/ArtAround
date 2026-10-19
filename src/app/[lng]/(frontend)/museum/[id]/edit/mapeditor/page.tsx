import { can, getSession } from '@/lib/session'
import config from '@/payload.config'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
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

/**
 * Staff-only map editor. Curators reach it to place objects; only the
 * director (who may update the museum's metadata, e.g. `name`) also gets the
 * structure and services tools. Both checks come from Payload's own access
 * rules via `can()`.
 */
export default async function Map({ params }: PageProps<'/[lng]/museum/[id]/edit/mapeditor'>) {
  const { lng, id: museumId } = await params
  const { payload, user } = await getSession()

  if (!(await can('museums', museumId, 'update', 'map'))) {
    redirect(`/${lng}/museum/${museumId}` as Route)
  }
  const canManageStructure = await can('museums', museumId, 'update', 'name')

  const queryClient = new QueryClient()

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
      <MapEditor
        museumId={museumId}
        canManageStructure={canManageStructure}
        // `can()` above already required a signed-in curator+, so `user` is set.
        viewer={user ? { id: String(user.id), isSuperAdmin: Boolean(user.isSuperAdmin) } : null}
      />
    </HydrationBoundary>
  )
}
