import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { getLocalizedPageDocument } from '@/lib/localized-page'

export default async function Content({ params }: PageProps<'/[lng]/content/[id]'>) {
  const { lng, id } = await params
  const content = await getLocalizedPageDocument('contents', id, lng)
  return <ContentDetailsModalContent content={content} />
}
