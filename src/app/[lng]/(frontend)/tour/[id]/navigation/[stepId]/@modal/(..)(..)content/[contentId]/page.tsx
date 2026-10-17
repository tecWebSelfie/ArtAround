import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import config from '@/payload.config'
import { getPayload } from 'payload'

export default async function ContentModal({
  params,
}: {
  params: Promise<{ contentId: string }>
}) {
  const { contentId } = await params
  const payload = await getPayload({ config })
  const content = await payload.findByID({
    collection: 'contents',
    id: contentId,
  })

  return <ContentDetailsModalContent content={content} />
}
