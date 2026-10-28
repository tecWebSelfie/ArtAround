import { redirect } from 'next/navigation'
import { museumNavigationPath, withNavigationPosition } from '@/lib/tour-navigation'
import { navigationModalTarget } from '../../../../intercept'

/**
 * Intercepts a canonical content URL (QR scan, in-map link) anywhere in the
 * museum navigation tree, free map or tour, and redirects it into the
 * contextual modal of the map being left (a tour's next stop opens `/open`),
 * keeping `at`/`to`. The ONLY interceptor for this route in the tree: tours
 * live below this slot, and a second one there would compete with it (see
 * `navigationModalTarget` and docs/tour-navigation.md).
 */
export default async function ContentModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; contentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lng, id, contentId } = await params
  const search = await searchParams
  redirect(
    (await navigationModalTarget('content', contentId, search)) ??
      withNavigationPosition(`${museumNavigationPath(lng, id)}/content/${contentId}`, search),
  )
}
