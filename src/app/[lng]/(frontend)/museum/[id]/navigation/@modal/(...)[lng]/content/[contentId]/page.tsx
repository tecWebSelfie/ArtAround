import { redirect } from 'next/navigation'
import { museumNavigationPath, withNavigationPosition } from '@/lib/tour-navigation'

/**
 * Intercepts a canonical content URL (QR scan, in-map link) while the free map
 * is open and redirects it into the contextual modal, keeping `at`/`to`. The
 * only interceptor for this route in the free tree (see docs/tour-navigation.md).
 */
export default async function ContentModal({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; contentId: string }>
  searchParams: Promise<{ at?: string | string[]; to?: string | string[] }>
}) {
  const { lng, id, contentId } = await params
  redirect(
    withNavigationPosition(
      `${museumNavigationPath(lng, id)}/content/${contentId}`,
      await searchParams,
    ),
  )
}
