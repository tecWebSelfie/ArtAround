import type { Route } from 'next'
import { BackButton } from '@/components/navigation/BackButton'
import { TourForm } from '@/components/editing/forms/TourForm'
import { getT } from '@/i18n.server'
import { coverImage } from '@/lib/cover-image'
import { lockedMuseumId } from '@/lib/museum-mode'
import { asViewer, getSession, requireUser } from '@/lib/session'
import { tourCopyPath, tourEditPath, VISIT_COPY_PARAM } from '@/lib/tour-routes'
import { withNavigationPosition } from '@/lib/tour-navigation'
import { DRAFT_PARAM } from '@/lib/tour-picker'
import { Alert, Container } from '@mantine/core'
import { redirect } from 'next/navigation'
import { extractID } from 'payload/shared'
import { copiedDirections } from '@/lib/tour-copy'
import { existingVisitCopy, getNewTourEditorData } from '../tour-editing'

/**
 * Create a tour (any signed-in user), or customize one (anyone). Entry points:
 * - `?museum=<id>` from a museum page ("Add tour");
 * - `?from=<tourId>` to customize someone else's tour: a new tour owned by
 *   the visitor, prefilled with the original's stops so locked (paid) ones
 *   can be replaced — the purchase modal's second option;
 * - `?from=<tourId>&visit=1` from the tour's start page ("Edit" on the
 *   cover): the visitor's own copy (`tours.visitCopyOf`), or their existing
 *   one reopened (`existingVisitCopy`).
 *
 * A visitor who is not signed in may customize a tour they can read (both
 * `?from=` entries): they get the editor in its anonymous mode, which only
 * changes the stops and the start entrance and saves an unowned visit copy
 * through `/api/tour-copy`. A blank new tour, or an original they can't read
 * (a private tour), still asks them to sign in.
 */
export default async function NewTourPage({ params, searchParams }: PageProps<'/[lng]/tour/new'>) {
  const { lng } = await params
  const query = await searchParams
  const from = typeof query.from === 'string' ? query.from : null
  const museumParam = typeof query.museum === 'string' ? query.museum : null
  const forVisit = query[VISIT_COPY_PARAM] === '1'
  // The visitor's navigation choices (step-free route, reading profile),
  // validated: kept through sign-in and on to the copy's start page.
  const navigation = withNavigationPosition('', query).slice(1)
  // Back here after signing in, with the same intent (a visit copy included).
  const returnTo = from
    ? tourCopyPath(lng, from, { visit: forVisit, navigation })
    : `/${lng}/tour/new?museum=${museumParam ?? ''}`
  const { payload, user } = await getSession()
  if (!from) await requireUser(lng, returnTo)
  const source = from
    ? await payload
        .findByID({ collection: 'tours', id: from, depth: 0, ...(await asViewer()) })
        .catch(() => null)
    : null
  // Anonymous: only a copy of a tour they can read; signing in may reveal it.
  const anonymous = !user
  if (anonymous && !source) await requireUser(lng, returnTo)
  // Anonymous: always a visit copy, so its own URL says so. Its "Sign in"
  // link and its draft key are that URL: back signed in, it is still the
  // visitor's copy, not a new public tour prefilled with the original.
  if (anonymous && !forVisit) redirect(tourCopyPath(lng, from!, { visit: true, navigation }))
  // An anonymous customization is always a visit copy: they can't own a tour.
  const visitSource = forVisit || anonymous ? source : null
  // `draft=1`: changes made before signing in, restored by this editor; the
  // visitor's older copy would drop them, so they save a new one instead.
  if (visitSource && query[DRAFT_PARAM] !== '1') {
    const copyId = await existingVisitCopy(visitSource)
    if (copyId)
      redirect(`${tourEditPath(lng, copyId)}${navigation ? `?${navigation}` : ''}` as Route)
  }
  // Museum mode: with no museum in the URL, a new tour is for the locked museum.
  const museumId = source ? extractID(source.museum) : (museumParam ?? (await lockedMuseumId()))

  if (!museumId) {
    const { t } = await getT('editing')
    return (
      <Container size="md" py="md">
        <Alert color="blue">
          {t('Open a museum and choose “Add tour” to build a tour for it.')}
        </Alert>
      </Container>
    )
  }

  const sourceStops = (source?.contents ?? []).map((content) =>
    typeof content === 'string' ? content : content.id,
  )
  // A copy starts with the stops its visitor can keep and visit only, with no
  // notice about the others (`getNewTourEditorData`), and with the original's
  // cover. If none (or too few) are left, the form asks for the missing stops
  // like for any new tour.
  const [{ museum, candidates, stops }, thumbnail] = await Promise.all([
    getNewTourEditorData(museumId, sourceStops),
    coverImage(payload, 'toursThumbnails', source?.thumbnail),
  ])
  // Up a level: back where the editor was opened from, else the tour it
  // copies or the museum it is for. Cancel leaves for the same place. A
  // planned tour has no page of its own to go back to: its preview in the
  // planner (restored there from sessionStorage, else its tour page).
  const upHref = (
    source?.generation?.generated
      ? `/${lng}/tour/plan?tour=${source.id}`
      : source
        ? `/${lng}/tour/${source.id}`
        : `/${lng}/museum/${museumId}`
  ) as Route
  return (
    <Container size="md" py="md">
      <BackButton href={upHref} />
      <TourForm
        museum={museum}
        candidates={candidates}
        thumbnail={thumbnail}
        cancelHref={upHref}
        // Only once the original was read: an unreadable `from` leaves a
        // blank form, which is a new tour, not a copy of anything.
        visitCopyOf={visitSource?.id ?? null}
        anonymous={anonymous}
        navigation={navigation}
        initial={
          source
            ? {
                title: source.title,
                description: source.description ?? '',
                // The copy visits the same building: its directions still apply.
                logistics: source.logistics ?? '',
                // …and starts from the same entrance.
                startEntrance: source.startEntrance ?? '',
                directions: copiedDirections(source, stops),
                contents: stops,
              }
            : undefined
        }
      />
    </Container>
  )
}
