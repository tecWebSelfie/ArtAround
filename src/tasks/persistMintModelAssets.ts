import { mintServerClient } from '@/lib/mint'
import { downloadMintArtifact } from '@/lib/mint/download'
import { getModel } from '@/lib/pascal/mint/client'
import { TaskConfig } from 'payload'

/**
 * Step 4 of generateObjectModel: turn the finished Mint model into permanent,
 * self-hosted Payload artifacts:
 *
 *   1. `GET /v1/models/{id}` → fresh download URLs (Mint's CDN URLs are
 *      short-lived signed snapshots — never store the URLs themselves; re-fetch
 *      at retrieval time, exactly as the Mint docs prescribe).
 *   2. Download the GLB (prefers the optimized derivative — smaller for the
 *      web viewer — when Mint has produced one) + the thumbnail image.
 *   3. Create the media docs (`objectsModels` with `userGenerated: false`,
 *      `objectsThumbnails` with the prompt as alt text).
 *   4. Link them onto the object. The `req.context` flag loop-guards the
 *      `objects` afterChange hook (which checks `skipMintModelGeneration`).
 *
 * The `mintModelId` / `mintOperationId` fields on `objectsModels` are the
 * accounting trail: "which Mint asset produced this file, and at what cost".
 */
export const persistMintModelAssets: TaskConfig<'persistMintModelAssets'> = {
  slug: 'persistMintModelAssets',
  label: 'Download Mint artifacts and persist them to Payload',
  inputSchema: [
    { name: 'objectId', type: 'text', required: true },
    { name: 'prompt', type: 'text', required: true },
    { name: 'mintModelId', type: 'text', required: true },
    { name: 'mintOperationId', type: 'text', required: true },
  ],
  outputSchema: [
    { name: 'objectsModelId', type: 'text', required: true },
    { name: 'objectsThumbnailId', type: 'text' },
  ],
  // Retry-safe: a duplicate model doc cannot be created because the guard
  // below short-circuits when the object is already linked to this Mint model.
  retries: 2,
  handler: async ({ input, req }) => {
    const object = await req.payload.findByID({
      collection: 'objects',
      id: input.objectId,
      depth: 0,
      req,
    })

    // Idempotence across task retries: if a previous attempt already linked a
    // model for this Mint model id, return it instead of creating duplicates.
    // (Job-task re-execution re-runs this task when a later step failed —
    // without this guard every retry would mint a new "mint-model" doc.)
    // Note: if the earlier attempt crashed BEFORE step 5 (linking onto the
    // object), a duplicate may still be created — acceptable for a uni project.
    if (object.model) {
      const existing = await req.payload.findByID({
        collection: 'objectsModels',
        id: typeof object.model === 'object' ? object.model.id : object.model,
        depth: 0,
        req,
      })
      if (existing.mintModelId && existing.mintModelId === input.mintModelId) {
        req.payload.logger.info({
          msg: 'Object already linked to this Mint model; skipping persist',
          objectId: input.objectId,
          mintModelId: input.mintModelId,
        })
        return {
          output: { objectsModelId: String(existing.id) },
        }
      }
    }

    const { data: model } = await getModel({
      client: mintServerClient,
      path: { modelId: input.mintModelId },
      throwOnError: true,
    })

    const glbUrl = model.assets?.optimizedGlbUrl ?? model.assets?.glbUrl
    if (!glbUrl) {
      throw new Error(`Mint model ${input.mintModelId} has no GLB artifact available`)
    }

    const { buffer: glbBuffer } = await downloadMintArtifact(glbUrl)

    const thumbnailUrl = model.assets?.thumbnailUrl ?? model.assets?.previewImageUrl
    let thumbnailId: string | undefined
    if (thumbnailUrl) {
      try {
        const { buffer: thumbBuffer, mimetype } = await downloadMintArtifact(thumbnailUrl)
        // objectsThumbnails requires an `alt` — the prompt is the most useful
        // machine-generated caption we have at this point.
        const thumbnail = await req.payload.create({
          collection: 'objectsThumbnails',
          data: { alt: input.prompt.slice(0, 300) || 'AI-generated model thumbnail' },
          file: {
            data: thumbBuffer,
            mimetype,
            name: `object-${input.objectId}-mint-${input.mintModelId}.png`,
            size: thumbBuffer.length,
          },
          req,
        })
        thumbnailId = String(thumbnail.id)
      } catch (err) {
        // Thumbnail is cosmetic — never fail the (already-paid) generation
        // because the image fetch hiccuped; the GLB is the load-bearing part.
        req.payload.logger.warn({
          msg: 'Failed to download Mint thumbnail; continuing without one',
          objectId: input.objectId,
          thumbnailUrl,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const objectsModel = await req.payload.create({
      collection: 'objectsModels',
      data: {
        userGenerated: false,
        mintModelId: input.mintModelId,
        mintOperationId: input.mintOperationId,
        ...(thumbnailId ? { thumbnail: thumbnailId } : {}),
      },
      file: {
        data: glbBuffer,
        mimetype: 'model/gltf-binary',
        name: `object-${input.objectId}-mint-${input.mintModelId}.glb`,
        size: glbBuffer.length,
      },
      req,
    })

    // Loop-guard: this update refires the `objects` afterChange hook, which
    // stands down when the skipMintModelGeneration context flag is set (the
    // `doc.model !== previousDoc.model` guard would also cover it, but the
    // flag makes the intent explicit).
    await req.payload.update({
      collection: 'objects',
      id: input.objectId,
      data: {
        model: objectsModel.id,
        ...(thumbnailId ? { thumbnail: thumbnailId } : {}),
      },
      context: { skipMintModelGeneration: true },
      req,
    })

    req.payload.logger.info({
      msg: 'Persisted Mint model artifacts',
      objectId: input.objectId,
      mintModelId: input.mintModelId,
      mintOperationId: input.mintOperationId,
      objectsModelId: String(objectsModel.id),
      thumbnailId: thumbnailId ?? null,
      glbSizeBytes: glbBuffer.length,
    })

    return {
      output: {
        objectsModelId: String(objectsModel.id),
        objectsThumbnailId: thumbnailId,
      },
    }
  },
}
