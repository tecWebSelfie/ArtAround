import { asId } from '@/access/museumRoles'
import { TourForm } from '@/components/editing/forms/TourForm'
import { coverImage } from '@/lib/cover-image'
import { asViewer, can, getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'
import { notFound, redirect } from 'next/navigation'
import { directionsByStop } from '@/lib/tour-logistics'
import { tourCopyPath, tourEditPath } from '@/lib/tour-routes'
import { getTourEditorData } from '../../tour-editing'

/** Edit an own tour (author only); others customize a copy via `/tour/new?from=`. */
export default async function EditTourPage({ params }: PageProps<'/[lng]/tour/[id]/edit'>) {
  const { lng, id } = await params
  await requireUser(lng, tourEditPath(lng, id))
  const { payload } = await getSession()
  // Read as the visitor: a deleted tour, or someone else's private one, is a
  // 404 rather than a copy of nothing.
  const [tour, canEdit] = await Promise.all([
    payload.findByID({
      collection: 'tours',
      id,
      depth: 0,
      disableErrors: true,
      ...(await asViewer()),
    }),
    can('tours', id, 'update'),
  ])
  if (!tour) notFound()
  if (!canEdit) redirect(tourCopyPath(lng, id))
  const stopIds = tour.contents.map((content) =>
    typeof content === 'string' ? content : content.id,
  )
  // Stops no longer visitable stay in the editor, flagged (not dropped on save).
  const [{ museum, candidates }, thumbnail] = await Promise.all([
    getTourEditorData(typeof tour.museum === 'string' ? tour.museum : tour.museum.id, stopIds),
    coverImage(payload, 'toursThumbnails', tour.thumbnail),
  ])

  return (
    <Container size="md" py="md">
      <TourForm
        tourId={tour.id}
        museum={museum}
        candidates={candidates}
        thumbnail={thumbnail}
        // A visit copy reopened ("Edit" on its start page) edits like the
        // first time: same notice, same return to its start page.
        visitCopyOf={asId(tour.visitCopyOf)}
        // A planned visit may keep a single stop (`src/lib/tour-stops.ts`).
        generated={tour.generation?.generated === true}
        initial={{
          title: tour.title,
          description: tour.description ?? '',
          visibility: tour.visibility ?? 'public',
          logistics: tour.logistics ?? '',
          directions: directionsByStop(tour),
          contents: stopIds,
        }}
      />
    </Container>
  )
}
