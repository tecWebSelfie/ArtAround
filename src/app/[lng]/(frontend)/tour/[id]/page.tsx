import { PICTURE_SELECT } from '@/lib/picture'
import { filterPopulated } from '@/lib/isPopulated'
import { normalizeLocale } from '@/lib/localized'
import { isLocked, lockedTotal } from '@/lib/price'
import { museumAffordances } from '@/lib/qr-museum'
import { asViewer, can, getSession } from '@/lib/session'
import { withStopObjects } from '@/lib/stop-objects'
import TourPage from './TourPage'
import type { Metadata } from 'next'

/** The tab names the tour (`%s · Artaround`, frontend layout). */
export async function generateMetadata({
  params,
}: PageProps<'/[lng]/tour/[id]'>): Promise<Metadata> {
  const { lng, id } = await params
  const { payload } = await getSession()
  const tour = await payload
    .findByID({
      collection: 'tours',
      id,
      depth: 0,
      select: { title: true },
      locale: normalizeLocale(lng) ?? 'en',
      ...(await asViewer()),
    })
    .catch(() => null)
  return tour ? { title: tour.title } : {}
}

/**
 * Tour details. Read as the visitor, so locked (paid, not owned) contents
 * come back without `body`; the page derives the tour price and the locked
 * list from that, and asks Payload whether the visitor may edit the tour.
 *
 * Depth 2 reaches each stop's own images; the works a stop talks about come
 * from a join Payload leaves as ids on nested documents, so `withStopObjects`
 * reads them right after the tour (their thumbnails stand in for stops
 * without an image). `populate` keeps every level to the fields the page
 * shows (no museum maps, object models or user records).
 */
export default async function Tour({ params }: PageProps<'/[lng]/tour/[id]'>) {
  const { lng, id } = await params
  const { payload, user } = await getSession()
  const viewer = await asViewer()
  // The permissions and the museum affordances only need the id: they are
  // read together with the tour, not after it.
  const locale = normalizeLocale(lng) ?? 'en'
  const [tour, canEdit, canDelete, { printMuseumId, offer }] = await Promise.all([
    payload
      .findByID({
        collection: 'tours',
        id,
        depth: 2,
        locale,
        populate: {
          contents: {
            title: true,
            difficulty: true,
            durationSeconds: true,
            price: true,
            // Withheld by field access when locked: `isLocked` reads its absence.
            body: true,
            images: true,
            objects: true,
          },
          contentImages: PICTURE_SELECT,
          museums: { name: true, location: true },
          users: { name: true },
          // Every picture with its URLs (src/lib/picture.ts).
          toursThumbnails: PICTURE_SELECT,
          // Only counted ("Ends with a quiz"). The select keeps prompts and answers
          // out of the client payload: TourPage is a client component.
          quizQuestions: { createdAt: true },
        },
        ...viewer,
      })
      .then((tour) => withStopObjects(payload, tour, locale, viewer)),
    can('tours', id, 'update'),
    can('tours', id, 'delete'),
    museumAffordances('tour', id),
  ])
  const contents = filterPopulated(tour.contents)

  return (
    <TourPage
      tour={tour}
      price={lockedTotal(contents)}
      lockedContentIds={contents.filter(isLocked).map((content) => content.id)}
      isSignedIn={Boolean(user)}
      canEdit={canEdit}
      canDelete={canDelete}
      printMuseumId={printMuseumId}
      museumOffer={offer}
    />
  )
}
