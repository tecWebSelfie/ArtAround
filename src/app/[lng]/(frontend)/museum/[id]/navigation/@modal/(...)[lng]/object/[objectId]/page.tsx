import { redirect } from 'next/navigation'
import { museumNavigationPath, withNavigationPosition } from '@/lib/tour-navigation'

/** Intercepts a canonical object URL so its details open over the free map. */
export default async function ObjectModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; objectId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, objectId } = await params
  redirect(
    withNavigationPosition(
      `${museumNavigationPath(lng, id)}/object/${objectId}`,
      await searchParams,
    ),
  )
}
