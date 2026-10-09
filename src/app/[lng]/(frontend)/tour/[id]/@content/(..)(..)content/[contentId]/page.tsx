import config from '@/payload.config'
import { getPayload } from 'payload'
import ContentDetailsModal from './ContentModal'

export default async function ContentModal({ params }: { params: Promise<{ contentId: string }> }) {
  const contentId = (await params).contentId
  const payload = await getPayload({
    config,
  })

  const content = await payload.findByID({
    collection: 'contents',
    id: contentId,
  })

  return <ContentDetailsModal content={content} />
}
