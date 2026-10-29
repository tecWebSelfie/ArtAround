import { TourForm } from '@/components/editing/forms/TourForm'
import { coverImage } from '@/lib/cover-image'
import { asViewer, can, getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'
import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getTourEditorData } from '../../tour-editing'

/** Edit an own tour (author only); others customize a copy via `/tour/new?from=`. */
export default async function EditTourPage({ params }: PageProps<'/[lng]/tour/[id]/edit'>) {
  const { lng, id } = await params
  await requireUser(lng, `/${lng}/tour/${id}/edit`)
  if (!(await can('tours', id, 'update'))) redirect(`/${lng}/tour/new?from=${id}` as Route)

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
        initial={{
          title: tour.title,
          description: tour.description ?? '',
          contents: stopIds,
        }}
      />
    </Container>
  )
}
