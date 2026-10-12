'use client'

import { payloadSdk } from '@/payload-sdk'
import { Modal } from '@mantine/core'
import { useParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { StepModalBody } from './StepModalBody'

type PageParams = Awaited<PageProps<'/[lng]/tour/[id]/navigation/[stepId]'>['params']>

export default function StepModal() {
  const { id: tourId, stepId } = useParams() satisfies PageParams
  const router = useRouter()
  return (
    <Modal opened onClose={() => router.back()}>
      <Suspense fallback={<div>Loading...</div>}>
        {payloadSdk
          .findByID({
            collection: 'tours',
            id: tourId,
            select: {
              contents: true,
            },
          })
          .then(async (tour) => {
            const contentOrId = tour.contents[parseInt(stepId)]
            const content =
              typeof contentOrId === 'object'
                ? contentOrId
                : await payloadSdk.findByID({
                    collection: 'contents',
                    id: contentOrId,
                  })
            return <StepModalBody step={content} />
          })}
      </Suspense>
    </Modal>
  )
}
