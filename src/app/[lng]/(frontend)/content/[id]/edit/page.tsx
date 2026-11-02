import type { Route } from 'next'
import { redirect } from 'next/navigation'

/**
 * Former standalone editor. A content's text and metadata are now edited
 * inline on its page (`ContentEditForm`, behind the section's Edit button),
 * so old links land there.
 */
export default async function EditContentPage({ params }: PageProps<'/[lng]/content/[id]/edit'>) {
  const { lng, id } = await params
  redirect(`/${lng}/content/${id}` as Route)
}
