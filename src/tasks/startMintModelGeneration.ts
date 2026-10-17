import { createHash } from 'crypto'
import { mintServerClient } from '@/lib/mint'
import { estimatePricing, generateModel, getUsage } from '@/lib/pascal/mint/client'
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
 * the job, then start it. The Idempotency-Key is derived from the object and
 * the resolved prompt, so a task retry after a network error reopens the same
 * Mint operation instead of double-charging.
 */
export const startMintModelGeneration: TaskConfig<'startMintModelGeneration'> = {
  slug: 'startMintModelGeneration',
  label: 'Start Mint 3D model generation',
  inputSchema: [
    { name: 'objectId', type: 'text', required: true },
    { name: 'prompt', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'mintOperationId', type: 'text', required: true },
    { name: 'creditsEstimatedTotal', type: 'number' },
  ],
  // Safe to retry: the idempotency key makes Mint treat repeats as the same job.
  retries: 3,
  handler: async ({ input, req }) => {
    const { data: usage } = await getUsage({ client: mintServerClient, throwOnError: true })
    const { data: estimate } = await estimatePricing({
      client: mintServerClient,
      body: {
        operation: 'model_generation',
        generationPreset: GENERATION_PRESET,
        generationMode: 'auto',
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
      .update(`object:${input.objectId}:${input.prompt}:${GENERATION_PRESET}`)
      .digest('hex')
      .slice(0, 48)

    const { data: operation } = await generateModel({
      client: mintServerClient,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: {
        prompt: input.prompt,
        name: `ArtAround object ${input.objectId}`,
        generationPreset: GENERATION_PRESET,
        generationMode: 'auto',
      },
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
