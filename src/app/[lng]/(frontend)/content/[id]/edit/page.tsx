import { ContentForm } from '@/components/editing/forms/ContentForm'
import { lexicalToHTML } from '@/lib/richtext'
import { asViewer, can, getSession, requireUser } from '@/lib/session'
import { Container } from '@mantine/core'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

/**
 * Edit a content's text and metadata (author only). Reads the source-locale
 * (`en`) values as the visitor, so the body is present for its author.
 */
export default async function EditContentPage({ params }: PageProps<'/[lng]/content/[id]/edit'>) {
  const { lng, id } = await params
  await requireUser(lng, `/${lng}/content/${id}/edit`)
  if (!(await can('contents', id, 'update'))) redirect(`/${lng}/content/${id}` as Route)

  const { payload } = await getSession()
  const content = await payload.findByID({
    collection: 'contents',
    id,
    depth: 0,
    locale: 'en',
    ...(await asViewer()),
  })

  return (
    <Container size="md" py="md">
      <ContentForm content={content} bodyHTML={lexicalToHTML(content.body)} />
    </Container>
  )
}
