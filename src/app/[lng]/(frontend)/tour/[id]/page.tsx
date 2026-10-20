import { filterPopulated } from '@/lib/isPopulated'
import { normalizeLocale } from '@/lib/localized'
import { isLocked, lockedTotal } from '@/lib/price'
import { asViewer, can, getSession } from '@/lib/session'
import TourPage from './TourPage'

/**
 * Tour details. Read as the visitor, so locked (paid, not owned) contents
 * come back without `body`; the page derives the tour price and the locked
 * list from that, and asks Payload whether the visitor may edit the tour.
 *
 * Depth 3 reaches each stop's picture (tour → content → object → thumbnail);
 * `populate` keeps every level to the fields the page shows, so the deeper
 * read stays small (no museum maps, object models or user records).
 */
export default async function Tour({ params }: PageProps<'/[lng]/tour/[id]'>) {
  const { lng, id } = await params
  const { payload, user } = await getSession()
  const tour = await payload.findByID({
    collection: 'tours',
    id,
    depth: 3,
    locale: normalizeLocale(lng) ?? 'en',
    populate: {
      contents: {
        title: true,
        difficulty: true,
        readingTimeMins: true,
        price: true,
        // Withheld by field access when locked: `isLocked` reads its absence.
        body: true,
        images: true,
        objects: true,
      },
      contentImages: { url: true, thumbnailURL: true, alt: true },
      objects: { name: true, thumbnail: true },
      objectsThumbnails: { url: true, thumbnailURL: true, alt: true },
      museums: { name: true, location: true },
      users: { name: true },
      toursThumbnails: { url: true, alt: true },
      // Only counted ("Ends with a quiz"). The select keeps prompts and answers
      // out of the client payload: TourPage is a client component.
      quizQuestions: { createdAt: true },
    },
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
