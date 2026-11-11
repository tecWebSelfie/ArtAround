import { PICTURE_SELECT } from '@/lib/picture'
import { filterPopulated } from '@/lib/isPopulated'
import { normalizeLocale, requestTourTranslations } from '@/lib/localized'
import { TranslationPending } from '@/components/TranslationPending'
import { isLocked, lockedTotal } from '@/lib/price'
import { museumAffordances } from '@/lib/qr-museum'
import { asViewer, can, getSession } from '@/lib/session'
import { withStopObjects } from '@/lib/stop-objects'
import TourPage from './TourPage'
import type { Metadata } from 'next'
import { cache } from 'react'

/** The tab names the tour (`%s · Artaround`, frontend layout), from the page's own read. */
export async function generateMetadata({
  params,
}: PageProps<'/[lng]/tour/[id]'>): Promise<Metadata> {
  const { lng, id } = await params
  const tour = await readTour(id, lng).catch(() => null)
  return tour ? { title: tour.title } : {}
}

/**
 * The tour as the page shows it, read once per request (React `cache`): the
 * page and its metadata share it. Read as the visitor, so locked (paid, not
 * owned) contents come back without `body`.
 *
 * Depth 2 reaches each stop's own images; the works a stop talks about come
 * from a join Payload leaves as ids on nested documents, so `withStopObjects`
 * reads them right after the tour (their thumbnails stand in for stops
 * without an image). `populate` keeps every level to the fields the page
 * shows (no museum maps, object models or user records).
 */
const readTour = cache(async (id: string, lng: string) => {
  const [{ payload }, viewer] = await Promise.all([getSession(), asViewer()])
  const locale = normalizeLocale(lng) ?? 'en'
  return payload
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
    .then((tour) => withStopObjects(payload, tour, locale, viewer))
})

/**
 * Tour details. The page derives the tour price and the locked list from the
 * visitor's read (`readTour`), and asks Payload whether the visitor may edit
 * the tour.
 */
export default async function Tour({ params }: PageProps<'/[lng]/tour/[id]'>) {
  const { lng, id } = await params
  const { user, payload } = await getSession()
  // The permissions and the museum affordances only need the id: they are
  // read together with the tour, not after it.
  const [tour, canEdit, canDelete, { printMuseumId, offer }] = await Promise.all([
    readTour(id, lng),
    can('tours', id, 'update'),
    can('tours', id, 'delete'),
    museumAffordances('tour', id),
  ])
  const contents = filterPopulated(tour.contents)
  // The read above falls back to English for whatever is not translated yet:
  // queue the tour and its stops, and let the page refresh until they arrive.
  const pending = await requestTourTranslations(payload, tour, normalizeLocale(lng) ?? 'en')

  return (
    <TourPage
      tour={tour}
      translationNotice={pending && <TranslationPending />}
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
