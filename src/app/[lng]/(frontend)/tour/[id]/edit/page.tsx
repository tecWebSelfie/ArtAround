import { TourForm } from '@/components/editing/forms/TourForm'
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
  const { museum, candidates } = await getTourEditorData(
    typeof tour.museum === 'string' ? tour.museum : tour.museum.id,
  )

  return (
    <Container size="md" py="md">
      <TourForm
        tourId={tour.id}
        museum={museum}
        candidates={candidates}
        initial={{
          title: tour.title,
          description: tour.description ?? '',
          contents: tour.contents.map((content) =>
            typeof content === 'string' ? content : content.id,
          ),
        }}
      />
    </Container>
  )
}
