import { redirect } from 'next/navigation'
import { museumNavigationPath, withNavigationPosition } from '@/lib/tour-navigation'
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
      withNavigationPosition(`${museumNavigationPath(lng, id)}/object/${objectId}`, search),
  )
}
