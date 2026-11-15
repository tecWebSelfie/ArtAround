import NavigationStartPage from './NavigationStartPage'
import { getNavigationTour } from '../../data'
import { normalizeLocale } from '@/lib/localized'
import { asViewer } from '@/lib/session'
import config from '@/payload.config'
import { getPayload } from 'payload'

/** Entry page before a tour starts (no map yet); the URL cursor begins after this screen. */
export default async function NavigationStart({
  params,
}: PageProps<'/[lng]/museum/[id]/navigation/tour/[tourId]'>) {
  const { lng, tourId } = await params
  const payload = await getPayload({ config })
  // The shared tour read is the source document (the layout's guard and every
  // step use it); this page shows the title, so it reads that in the
  // visitor's language alongside.
  const [tour, localized] = await Promise.all([
    getNavigationTour(tourId, lng),
    payload
      .findByID({
        collection: 'tours',
        id: tourId,
        depth: 0,
        locale: normalizeLocale(lng) ?? 'en',
        select: { title: true },
        ...(await asViewer()),
      })
      .catch(() => null),
  ])
  return <NavigationStartPage tour={{ ...tour, title: localized?.title ?? tour.title }} lng={lng} />
}
