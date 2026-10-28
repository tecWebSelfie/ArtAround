import { ContentForm } from '@/components/editing/forms/ContentForm'
import { lockedMuseumId } from '@/lib/museum-mode'
import { getSession, requireUser } from '@/lib/session'
import { safeTourReturnTo } from '@/lib/tour-picker'
import { Container } from '@mantine/core'

/**
 * Write a new content. Any signed-in user may; `?object=<id>` preselects the
 * object it is about (e.g. from an object page's "Add content").
 *
 * From the tour editor (`?museum=<id>&returnTo=<editor>`, see
 * `src/lib/tour-picker.ts`) it is a new stop: the object is chosen among that
 * museum's exhibited ones, and saving returns to the editor with it added.
 */
export default async function NewContentPage({
  params,
  searchParams,
}: PageProps<'/[lng]/content/new'>) {
  const { lng } = await params
  const query = await searchParams
  const objectId = typeof query.object === 'string' ? query.object : null
  const museumId = typeof query.museum === 'string' ? query.museum : null
  const returnTo = safeTourReturnTo(
    lng,
    typeof query.returnTo === 'string' ? query.returnTo : undefined,
  )
  const ownQuery = new URLSearchParams({
    ...(objectId ? { object: objectId } : {}),
    ...(museumId && returnTo ? { museum: museumId, returnTo } : {}),
  })
  await requireUser(lng, `/${lng}/content/new${ownQuery.size ? `?${ownQuery}` : ''}`)

  const { payload } = await getSession()
  // The object picker offers one museum's objects: the tour's in the tour
  // flow, else the locked one in museum mode (like every list in the app).
  const tourFlow = Boolean(museumId && returnTo)
  const pickerMuseumId = tourFlow ? museumId : await lockedMuseumId()
  const [museum, object] = await Promise.all([
    pickerMuseumId
      ? payload
          .findByID({
            collection: 'museums',
            id: pickerMuseumId,
            depth: 0,
            select: { name: true, objects: true },
          })
          .catch(() => null)
      : null,
    objectId
      ? payload
          .findByID({ collection: 'objects', id: objectId, depth: 0, select: { name: true } })
          .catch(() => null)
      : null,
  ])

  return (
    <Container size="md" py="md">
      <ContentForm
        initialObject={object ? { id: object.id, name: object.name } : null}
        museum={
          museum
            ? {
                name: museum.name,
                objectIds: (museum.objects ?? []).map((o) => (typeof o === 'string' ? o : o.id)),
              }
            : null
        }
        // Back to the tour only in the tour flow, not in plain museum mode.
        returnTo={tourFlow && museum ? returnTo : null}
      />
    </Container>
  )
}
