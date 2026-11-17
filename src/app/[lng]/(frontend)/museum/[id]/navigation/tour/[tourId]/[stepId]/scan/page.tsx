import { navigationScanPath, withNavigationPosition } from '@/lib/tour-navigation'
import { tourStartPath } from '@/lib/tour-routes'
import { redirect } from 'next/navigation'

/**
 * Old in-map scanner URL of a tour (`…/[stepId]/scan`): the scanner now has
 * its own page (`/[lng]/scan`, see QrScanPage), which comes back to this tour
 * step with the position kept.
 */
export default async function Scan({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string; tourId: string; stepId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ lng, id, tourId, stepId }, search] = await Promise.all([params, searchParams])
  // The step segment as it came: the map validates it, as on any tour URL.
  const map = `${tourStartPath(lng, id, tourId)}/${stepId}`
  redirect(navigationScanPath(lng, withNavigationPosition(map, search)))
}
