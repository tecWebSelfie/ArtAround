import { redirect } from 'next/navigation'
import { navigationDetailPath, withNavigationPosition } from '@/lib/tour-navigation'
import { navigationModalTarget } from '../../../../intercept'

/**
 * Intercepts a canonical object URL so its details open over the map being
 * left (free map or a tour at its cursor). The only interceptor for this route
 * in the navigation tree (see `navigationModalTarget`).
 */
export default async function ObjectModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; objectId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng, id, objectId } = await params
  const search = await searchParams
  redirect(
    (await navigationModalTarget('object', objectId, search)) ??
      withNavigationPosition(
        navigationDetailPath(lng, { kind: 'free', museumId: id }, 'object', objectId),
        search,
      ),
  )
}
