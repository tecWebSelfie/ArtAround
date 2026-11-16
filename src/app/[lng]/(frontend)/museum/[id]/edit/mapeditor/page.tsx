import { can, getSession } from '@/lib/session'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { MapEditor } from './MapEditor'

/**
 * Staff-only page reading the visitor's session (`headers()`) on every
 * request: dynamic by declaration, like the museum details page — the
 * on-demand static render an unprerendered dynamic param would otherwise get
 * fails on `headers()` (DYNAMIC_SERVER_USAGE).
 */
export const dynamic = 'force-dynamic'

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
