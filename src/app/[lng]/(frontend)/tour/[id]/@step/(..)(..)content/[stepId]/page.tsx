import config from '@/payload.config'
import { getPayload } from 'payload'
import StepDetailsModal from './StepModal'

export default async function StepModal({ params }: { params: Promise<{ stepId: string }> }) {
  const stepId = (await params).stepId
  const payload = await getPayload({
    config,
  })

  const content = await payload.findByID({
    collection: 'contents',
    id: stepId,
  })

  return <StepDetailsModal content={content} />
}
