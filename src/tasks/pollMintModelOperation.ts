import { mintServerClient } from '@/lib/mint/mint-server-client'
import { getOperation } from '@/lib/pascal/mint/client'
import { zModelGenerationOperation } from '@/lib/pascal/mint/client/zod.gen'
import { payloadMintJSONField } from '@/lib/payload-mint-json-field'
import type { TaskConfig } from 'payload'

/** Async waiting occupies one job, without creating a job per polling tick. */
export const pollMintModelOperation: TaskConfig<'pollMintModelOperation'> = {
  slug: 'pollMintModelOperation',
  label: 'Wait for a Mint preview or final model',
  inputSchema: [
    { name: 'mintOperationId', type: 'text', required: true },
    { name: 'objectId', type: 'text', required: true },
    { name: 'stage', type: 'select', options: ['preview', 'final'] },
  ],
  outputSchema: [
    { name: 'mintModelId', type: 'text' },
    { name: 'mintOperationId', type: 'text', required: true },
    { ...payloadMintJSONField('operation', zModelGenerationOperation), required: true },
  ],
  retries: 1,
  handler: async ({ input }) => {
    const deadline = Date.now() + 30 * 60_000
    let interval = 2_000
    while (Date.now() < deadline) {
      const { data } = await getOperation({
        client: mintServerClient,
        path: { operationId: input.mintOperationId },
        throwOnError: true,
      })
      const operation = zModelGenerationOperation.parse(data)
      const succeeded = ['succeeded', 'partially_succeeded'].includes(operation.status)
      const previewReady = input.stage === 'preview' && operation.status === 'preview_ready'
      if (previewReady || (succeeded && !operation.credits?.reserved)) {
        if (!previewReady && !operation.resource)
          throw new Error('Finished generation has no model')
        return {
          output: { mintOperationId: operation.id, mintModelId: operation.resource?.id, operation },
        }
      }
      if (!['queued', 'running', 'succeeded', 'partially_succeeded'].includes(operation.status)) {
        throw new Error(operation.error?.message || `Mint generation ${operation.status}`)
      }
      await new Promise((resolve) => setTimeout(resolve, interval))
      interval = Math.min(interval * 1.5, 15_000)
    }
    throw new Error('Mint generation timed out; retry this job to resume waiting')
  },
}
