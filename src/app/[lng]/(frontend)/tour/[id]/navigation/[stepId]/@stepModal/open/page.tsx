import config from '@/payload.config'
import { getPayload } from 'payload'
import { StepModalClient } from './StepModalClient'

export default async function StepModal({
  params,
}: PageProps<'/[lng]/tour/[id]/navigation/[stepId]'>) {
  const { id: tourId, stepId } = await params
  const payload = await getPayload({ config })
  const tour = await payload.findByID({
    collection: 'tours',
    id: tourId,
    select: { contents: true },
  })
  const contentOrId = tour.contents[Number(stepId)]
  const content =
    typeof contentOrId === 'object'
      ? contentOrId
      : await payload.findByID({ collection: 'contents', id: contentOrId })

  return <StepModalClient step={content} />
}
