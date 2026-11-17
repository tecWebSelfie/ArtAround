import {
  museumNavigationPath,
  navigationScanPath,
  withNavigationPosition,
} from '@/lib/tour-navigation'
import { redirect } from 'next/navigation'

/**
 * Old in-map scanner URL (`…/navigation/scan`): the scanner now has its own
 * page (`/[lng]/scan`, see QrScanPage), so links and history entries to this
 * one land there, coming back to this free map with the position kept.
 */
export default async function Scan({
  params,
  searchParams,
}: {
  params: Promise<{ lng: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ lng, id }, search] = await Promise.all([params, searchParams])
  redirect(navigationScanPath(lng, withNavigationPosition(museumNavigationPath(lng, id), search)))
}
