import type { Route } from 'next'
import { BackButton } from '@/components/navigation/BackButton'
import { TourForm } from '@/components/editing/forms/TourForm'
import { getT } from '@/i18n.server'
import { coverImage } from '@/lib/cover-image'
import { lockedMuseumId } from '@/lib/museum-mode'
import { asViewer, getSession, requireUser } from '@/lib/session'
import { tourCopyPath, tourEditPath, VISIT_COPY_PARAM } from '@/lib/tour-routes'
import { Alert, Container } from '@mantine/core'
import { redirect } from 'next/navigation'
import { directionsByStop } from '@/lib/tour-logistics'
import { existingVisitCopy, getTourEditorData } from '../tour-editing'

/**
 * Create a tour (any signed-in user). Entry points:
 * - `?museum=<id>` from a museum page ("Add tour");
 * - `?from=<tourId>` to customize someone else's tour: a new tour owned by
 *   the visitor, prefilled with the original's stops so locked (paid) ones
 *   can be replaced — the purchase modal's second option;
 * - `?from=<tourId>&visit=1` from the tour's start page ("Edit" on the
 *   cover): the visitor's own copy (`tours.visitCopyOf`), or their existing
 *   one reopened (`existingVisitCopy`).
 */
export default async function NewTourPage({ params, searchParams }: PageProps<'/[lng]/tour/new'>) {
  const { lng } = await params
  const query = await searchParams
  const from = typeof query.from === 'string' ? query.from : null
  const museumParam = typeof query.museum === 'string' ? query.museum : null
  const forVisit = query[VISIT_COPY_PARAM] === '1'
  // Back here after signing in, with the same intent (a visit copy included).
  const returnTo = from
    ? tourCopyPath(lng, from, { visit: forVisit })
    : `/${lng}/tour/new?museum=${museumParam ?? ''}`
  await requireUser(lng, returnTo)

  const { payload } = await getSession()
  const source = from
    ? await payload
        .findByID({ collection: 'tours', id: from, depth: 0, ...(await asViewer()) })
        .catch(() => null)
    : null
  const visitSource = forVisit ? source : null
  if (visitSource) {
    const copyId = await existingVisitCopy(visitSource)
    if (copyId) redirect(tourEditPath(lng, copyId))
  }
  // Museum mode: with no museum in the URL, a new tour is for the locked museum.
  const museumId = source
    ? typeof source.museum === 'string'
      ? source.museum
      : source.museum.id
    : (museumParam ?? (await lockedMuseumId()))

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
  // A customized copy shows the original's unvisitable stops too (flagged),
  // and starts with the original's cover.
  const [{ museum, candidates }, thumbnail] = await Promise.all([
    getTourEditorData(museumId, sourceStops),
    coverImage(payload, 'toursThumbnails', source?.thumbnail),
  ])
  return (
    <Container size="md" py="md">
      {/* Up a level: back where the editor was opened from, else the tour it
          copies or the museum it is for. */}
      <BackButton
        href={(source ? `/${lng}/tour/${source.id}` : `/${lng}/museum/${museumId}`) as Route}
      />
      <TourForm
        museum={museum}
        candidates={candidates}
        thumbnail={thumbnail}
        // Only once the original was read: an unreadable `from` leaves a
        // blank form, which is a new tour, not a copy of anything.
        visitCopyOf={visitSource?.id ?? null}
        initial={
          source
            ? {
                title: source.title,
                description: source.description ?? '',
                // The copy visits the same building: its directions still apply.
                logistics: source.logistics ?? '',
                directions: directionsByStop(source),
                contents: sourceStops,
              }
            : undefined
        }
      />
    </Container>
  )
}
