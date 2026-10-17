import config from '@/payload.config'
import { getPayload } from 'payload'
import { StepModal } from './StepModal'

//this modal will open when the user clicks on the step/content that he has as the next step in the tour, and it will show the content of that step in a modal
export default async function OpenStepModal({
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

  return <StepModal step={content} />
}
