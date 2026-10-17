import { WorkflowConfig } from 'payload'

/**
 * Workflow that turns a museum object into an AI-generated 3D model via the
 * Mint API, fully server-side (the Mint API key never leaves the server).
 *
 * Steps as *registered tasks* (each with its own file under `src/tasks/`,
 * retries and typed output, so the workflow resumes from the point of failure
 * without re-running completed steps or double-charging Mint):
 *
 *   1. loadObjectGenerationContext — resolve prompt, guard user uploads
 *   2. startMintModelGeneration    — silent credit check + idempotent start
 *   3. pollMintModelOperation      — bounded poll of GET /v1/operations/:id
 *   4. persistMintModelAssets      — fresh artifact URLs → download →
 *     objectsModels (userGenerated: false) + objectsThumbnails → link object
 *
 * Cueing rules live on the `objects` afterChange hook (src/collections/Objects.ts):
 * it queues this workflow whenever an object is created/edited and its
 * prompt-relevant fields changed, unless a human-uploaded model exists.
 *
 * Reference images: the Mint `imageUrl` / `sourceImages` parameters require
 * *public* HTTPS URLs. Payload upload files are behind app auth (and, in dev,
 * behind localhost), so image-guided generation is deliberately not wired yet —
 * enabling it means uploading curator images to Mint first via
 * `uploadReferenceImage`, then passing the returned URL.
 */
export const generateObjectModelWorkflow: WorkflowConfig<'generateObjectModel'> = {
  slug: 'generateObjectModel',
  label: 'Generate 3D Model for a museum object',
  inputSchema: [
    { name: 'objectId', type: 'text', required: true },
    // Optional prompt override; when omitted the prompt is derived from the
    // object’s name + description inside loadObjectGenerationContext.
    { name: 'prompt', type: 'text', required: false },
  ],
  queue: 'default',
  handler: async ({ job, tasks, req }) => {
    // Step 1 — resolve context / guards. Typed via the TaskConfig generics.
    // Task results resolve directly to their typed output shapes.
    const context = await tasks.loadObjectGenerationContext('load-context', {
      input: { objectId: job.input.objectId, prompt: job.input.prompt },
    })
    if (context.skip) {
      req.payload.logger.info({
        msg: 'Skipping model generation',
        objectId: job.input.objectId,
        reason: context.skipReason ?? 'unspecified',
      })
      return
    }

    // Caller-supplied prompt (if any) wins over the derived one.
    const prompt = job.input.prompt?.trim() || context.prompt

    // Step 2 — estimate + start (cached on retry; no double charge).
    const generation = await tasks.startMintModelGeneration('start-mint', {
      input: { objectId: job.input.objectId, prompt },
    })

    // Step 3 — poll. Throws on Mint-side failure; job retries re-poll.
    const operation = await tasks.pollMintModelOperation('poll-mint', {
      input: {
        mintOperationId: generation.mintOperationId,
        objectId: job.input.objectId,
      },
    })

    // Step 4 — persist GLB + thumbnail and link onto the object.
    await tasks.persistMintModelAssets('persist-assets', {
      input: {
        objectId: job.input.objectId,
        prompt,
        mintModelId: operation.mintModelId,
        mintOperationId: operation.mintOperationId,
      },
    })
  },
}
