import { ContentForm } from '@/components/editing/forms/ContentForm'
import { getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'

/**
 * Write a new content. Any signed-in user may; `?object=<id>` preselects the
 * object it is about (e.g. from an object page's "Add content").
 */
export default async function NewContentPage({
  params,
  searchParams,
}: PageProps<'/[lng]/content/new'>) {
  const { lng } = await params
  const { object: objectParam } = await searchParams
  const objectId = typeof objectParam === 'string' ? objectParam : null
  await requireUser(lng, `/${lng}/content/new${objectId ? `?object=${objectId}` : ''}`)

  const { payload } = await getSession()
  const object = objectId
    ? await payload
        .findByID({ collection: 'objects', id: objectId, depth: 0, select: { name: true } })
        .catch(() => null)
    : null

  return (
    <Container size="md" py="md">
      <ContentForm initialObject={object ? { id: object.id, name: object.name } : null} />
    </Container>
  )
}
