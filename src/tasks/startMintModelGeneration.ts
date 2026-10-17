import { mintServerClient } from '@/lib/mint/mint-server-client'
import { estimatePricing, generateModel, getOperation, getUsage } from '@/lib/pascal/mint/client'
import { zGenerateModelBody } from '@/lib/pascal/mint/client/zod.gen'
import { payloadMintJSONField } from '@/lib/payload-mint-json-field'
import { createHash } from 'crypto'
import { TaskConfig } from 'payload'

/**
 * Cost guard. The curator never sees Mint numbers — the UI shows a plain
 * spinner. This cap exists only so a bug (or a pathological prompt) cannot
 * silently fire an expensive `production` run. `standard` is the max preset.
 */
const GENERATION_PRESET = 'standard' as const
const MAX_CREDITS_REQUIRED_TO_START = 1_000

/**
 * Step 2 of generateObjectModel: silently verify the Mint account can afford
 * the job, then start it. A stable submission/job key makes uncertain retries
 * reopen the same operation while allowing a later intentional regeneration.
 */
export const startMintModelGeneration: TaskConfig<'startMintModelGeneration'> = {
  slug: 'startMintModelGeneration',
  label: 'Start Mint 3D model generation',
  inputSchema: [
    { name: 'objectId', type: 'text', required: true },
    { name: 'prompt', type: 'text', required: true },
    { name: 'review', type: 'checkbox' },
    { name: 'requestId', type: 'text' },
    payloadMintJSONField('generation', zGenerateModelBody),
  ],
  outputSchema: [
    { name: 'mintOperationId', type: 'text', required: true },
    { name: 'creditsEstimatedTotal', type: 'number' },
  ],
  // Safe to retry: the idempotency key makes Mint treat repeats as the same job.
  retries: 3,
  handler: async ({ input, req, job }) => {
    const generation = zGenerateModelBody.optional().parse(input.generation ?? undefined)
    const generationMode = input.review ? 'review' : 'auto'
    const body = zGenerateModelBody.parse({
      ...generation,
      prompt: input.prompt,
      name: generation?.name ?? `ArtAround object ${input.objectId}`,
      generationPreset: GENERATION_PRESET,
      generationMode,
    })
    if (input.review) {
      // A second queued start may have waited behind the first. Reuse the
      // remote operation even though the prior preview job has finished.
      const previous = await req.payload.find({
        collection: 'payload-jobs',
        depth: 0,
        limit: 1,
        sort: '-createdAt',
        req,
        where: {
          and: [
            { workflowSlug: { equals: 'interactiveObjectModel' } },
            { 'input.objectId': { equals: input.objectId } },
            { 'input.action': { equals: 'start' } },
            { id: { not_equals: job.id } },
            { completedAt: { exists: true } },
          ],
        },
      })
      const priorOutput = previous.docs[0]?.log?.find(
        (log) => log.taskSlug === 'startMintModelGeneration' && log.state === 'succeeded',
      )?.output
      if (
        priorOutput &&
        typeof priorOutput === 'object' &&
        'mintOperationId' in priorOutput &&
        typeof priorOutput.mintOperationId === 'string'
      ) {
        const { data } = await getOperation({
          client: mintServerClient,
          path: { operationId: priorOutput.mintOperationId },
          throwOnError: true,
        })
        if (['queued', 'running', 'preview_ready', 'billing_required'].includes(data.status)) {
          return { output: { mintOperationId: data.id } }
        }
      }
    }
    const { data: usage } = await getUsage({ client: mintServerClient, throwOnError: true })
    const { data: estimate } = await estimatePricing({
      client: mintServerClient,
      body: {
        operation: 'model_generation',
        generationPreset: GENERATION_PRESET,
        generationMode,
      },
      throwOnError: true,
    })

    const available = Math.min(usage.credits.totalAvailable, usage.credits.monthlyRemaining)
    if (estimate.credits.requiredToStart > MAX_CREDITS_REQUIRED_TO_START) {
      throw new Error(
        `Mint generation estimate ${estimate.credits.requiredToStart} credits exceeds the ${MAX_CREDITS_REQUIRED_TO_START} credit cap`,
      )
    }
    if (available < estimate.credits.requiredToStart) {
      throw new Error(
        `Mint generation requires ${estimate.credits.requiredToStart} credits, ${available} available`,
      )
    }

    const idempotencyKey = createHash('sha256')
      .update(`object:${input.objectId}:${input.requestId ?? job.id}:${generationMode}`)
      .digest('hex')
      .slice(0, 48)

    const { data: operation } = await generateModel({
      client: mintServerClient,
      headers: { 'Idempotency-Key': idempotencyKey },
      body,
      throwOnError: true,
    })

    req.payload.logger.info({
      msg: 'Started Mint model generation',
      objectId: input.objectId,
      mintOperationId: operation.id,
      creditsEstimatedTotal: estimate.credits.estimatedTotal,
    })

    return {
      output: {
        mintOperationId: operation.id,
        creditsEstimatedTotal: estimate.credits.estimatedTotal,
      },
    }
  },
}
