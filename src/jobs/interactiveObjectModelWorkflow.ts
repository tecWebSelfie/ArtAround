import { mintServerClient } from '@/lib/mint/mint-server-client'
import { INTERACTIVE_MODEL_QUEUE } from '@/lib/model-generation'
import { approveOperation, getOperation, reviseOperation } from '@/lib/pascal/mint/client'
import { zGenerateModelBody, zReviseOperationBody } from '@/lib/pascal/mint/client/zod.gen'
import { payloadMintJSONField } from '@/lib/payload-mint-json-field'
import type { Field, WorkflowConfig } from 'payload'

const identityFields: Field[] = [
  { name: 'objectId', type: 'text', required: true },
  { name: 'requestedBy', type: 'text', required: true },
  { name: 'requestId', type: 'text', required: true },
  { name: 'prompt', type: 'text' },
]

/** One job ends only once a preview is available for an explicit user decision. */
export const interactiveObjectModelWorkflow: WorkflowConfig<'interactiveObjectModel'> = {
  slug: 'interactiveObjectModel',
  queue: INTERACTIVE_MODEL_QUEUE,
  concurrency: ({ input }) => `interactive-object:${input.objectId}`,
  inputSchema: [
    ...identityFields,
    { name: 'action', type: 'select', required: true, options: ['start', 'revise'] },
    { name: 'operationId', type: 'text' },
    payloadMintJSONField('revision', zReviseOperationBody),
    payloadMintJSONField('generation', zGenerateModelBody),
  ],
  handler: async ({ job, tasks, inlineTask }) => {
    const input = job.input
    const context = await tasks.loadObjectGenerationContext('load-context', {
      input: { objectId: input.objectId, prompt: input.prompt },
    })
    if (context.skip) throw new Error(context.skipReason || 'Generation is unavailable')
    const generation =
      input.action === 'revise'
        ? await inlineTask('revise-preview', {
            retries: 2,
            task: async () => {
              if (!input.operationId) throw new Error('Missing preview operation')
              const { data } = await reviseOperation({
                client: mintServerClient,
                path: { operationId: input.operationId },
                headers: { 'Idempotency-Key': `revise:${input.requestId}` },
                body: zReviseOperationBody.parse(input.revision),
                throwOnError: true,
              })
              return { output: { mintOperationId: data.id } }
            },
          })
        : await tasks.startMintModelGeneration('start-mint', {
            input: {
              objectId: input.objectId,
              prompt: context.prompt,
              review: true,
              requestId: input.requestId,
              generation: input.generation,
            },
          })
    await tasks.pollMintModelOperation('wait-preview', {
      input: {
        objectId: input.objectId,
        mintOperationId: generation.mintOperationId,
        stage: 'preview',
      },
    })
  },
}

/** A separate durable job owns approval, final generation, and Payload persistence. */
export const finalizeObjectModelWorkflow: WorkflowConfig<'finalizeObjectModel'> = {
  slug: 'finalizeObjectModel',
  queue: INTERACTIVE_MODEL_QUEUE,
  concurrency: ({ input }) => `interactive-object:${input.objectId}`,
  inputSchema: [
    ...identityFields,
    { name: 'previewJobId', type: 'text', required: true },
    { name: 'operationId', type: 'text', required: true },
  ],
  handler: async ({ job, tasks, inlineTask }) => {
    const input = job.input
    await inlineTask('approve-preview', {
      retries: 2,
      task: async () => {
        const { data } = await getOperation({
          client: mintServerClient,
          path: { operationId: input.operationId },
          throwOnError: true,
        })
        if (data.status === 'preview_ready') {
          await approveOperation({
            client: mintServerClient,
            path: { operationId: input.operationId },
            headers: { 'Idempotency-Key': `approve:${input.requestId}` },
            throwOnError: true,
          })
        } else if (
          !['queued', 'running', 'succeeded', 'partially_succeeded'].includes(data.status)
        ) {
          throw new Error(`Cannot approve an operation with status ${data.status}`)
        }
        return { output: { mintOperationId: input.operationId } }
      },
    })
    const model = await tasks.pollMintModelOperation('wait-model', {
      input: { objectId: input.objectId, mintOperationId: input.operationId, stage: 'final' },
    })
    if (!model.mintModelId) throw new Error('Finished generation has no model')
    await tasks.persistMintModelAssets('persist-assets', {
      input: {
        objectId: input.objectId,
        prompt: input.prompt ?? '',
        mintOperationId: input.operationId,
        mintModelId: model.mintModelId,
      },
    })
  },
}
