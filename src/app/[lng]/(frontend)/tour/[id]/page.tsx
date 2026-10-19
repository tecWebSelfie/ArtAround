import { filterPopulated } from '@/lib/isPopulated'
import { isLocked, lockedTotal } from '@/lib/price'
import { asViewer, can, getSession } from '@/lib/session'
import TourPage from './TourPage'

/**
 * Tour details. Read as the visitor, so locked (paid, not owned) contents
 * come back without `body`; the page derives the tour price and the locked
 * list from that, and asks Payload whether the visitor may edit the tour.
 */
export default async function Tour({ params }: PageProps<'/[lng]/tour/[id]'>) {
  const { id } = await params
  const { payload, user } = await getSession()
  const tour = await payload.findByID({
    collection: 'tours',
    id,
    depth: 1,
    ...(await asViewer()),
  })
  const contents = filterPopulated(tour.contents)

  return (
    <TourPage
      tour={tour}
      price={lockedTotal(contents)}
      lockedContentIds={contents.filter(isLocked).map((content) => content.id)}
      isSignedIn={Boolean(user)}
      canEdit={await can('tours', id, 'update')}
      canDelete={await can('tours', id, 'delete')}
    />
  )
}
