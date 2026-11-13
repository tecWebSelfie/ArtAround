import { asId } from '@/access/museumRoles'
import { TourForm } from '@/components/editing/forms/TourForm'
import { coverImage } from '@/lib/cover-image'
import { asViewer, can, getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'
import { redirect } from 'next/navigation'
import { directionsByStop } from '@/lib/tour-logistics'
import { tourCopyPath, tourEditPath } from '@/lib/tour-routes'
import { getTourEditorData } from '../../tour-editing'

/** Edit an own tour (author only); others customize a copy via `/tour/new?from=`. */
export default async function EditTourPage({ params }: PageProps<'/[lng]/tour/[id]/edit'>) {
  const { lng, id } = await params
  await requireUser(lng, tourEditPath(lng, id))
  if (!(await can('tours', id, 'update'))) redirect(tourCopyPath(lng, id))

  const { payload } = await getSession()
  const tour = await payload.findByID({ collection: 'tours', id, depth: 0, ...(await asViewer()) })
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
