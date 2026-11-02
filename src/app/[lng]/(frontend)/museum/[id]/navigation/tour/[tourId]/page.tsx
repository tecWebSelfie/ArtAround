import NavigationStartPage from './NavigationStartPage'
import { getNavigationTour } from '../../data'

/** Entry page before a tour starts (no map yet); the URL cursor begins after this screen. */
export default async function NavigationStart({
  params,
}: PageProps<'/[lng]/museum/[id]/navigation/tour/[tourId]'>) {
  const tour = await getNavigationTour((await params).tourId)
  return <NavigationStartPage tour={tour} />
}
