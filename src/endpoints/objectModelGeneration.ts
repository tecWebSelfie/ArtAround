import { mintServerClient } from '@/lib/mint/mint-server-client'
import {
  INTERACTIVE_MODEL_QUEUE,
  MODEL_WORKFLOWS,
  modelGenerationCommand,
  objectGenerationPrompt,
} from '@/lib/model-generation'
import { uploadReferenceImage } from '@/lib/pascal/mint/client'
import { zGenerateModelBody, zUploadReferenceImageBody } from '@/lib/pascal/mint/client/zod.gen'
import type { Object as MuseumObject } from '@/payload-types'
import { docAccessOperation, type Endpoint, type Job, type PayloadRequest } from 'payload'
import { z } from 'zod'

const REFERENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const REFERENCE_MAX_BYTES = 5 * 1024 * 1024

/**
 * The object's stored thumbnail as a Mint reference image, for generations
 * that may only use the object's own data. Mint can't reach Payload URLs in
 * local setups, so the file is sent as base64 (same Mint endpoint the
 * browser uses for owner uploads) and Mint's hosted URL is returned.
 * Best effort: no thumbnail, an unsupported file or a failed upload falls
 * back to a text-only generation.
 */
async function objectThumbnailReference(
  req: PayloadRequest,
  object: MuseumObject,
): Promise<string | undefined> {
  const thumbnailId = typeof object.thumbnail === 'object' ? object.thumbnail?.id : object.thumbnail
  if (!thumbnailId || !req.url) return undefined
  try {
    const thumbnail = await req.payload.findByID({
      collection: 'objectsThumbnails',
      id: thumbnailId,
      depth: 0,
      req,
    })
    if (!thumbnail.url || !REFERENCE_TYPES.includes(thumbnail.mimeType ?? '')) return undefined
    // Through Payload's own file route, so any storage adapter works.
    const file = await fetch(new URL(thumbnail.url, req.url))
    if (!file.ok) return undefined
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.byteLength > REFERENCE_MAX_BYTES) return undefined
    const { data } = await uploadReferenceImage({
      client: mintServerClient,
      // Stable per thumbnail: retries and later generations reuse the same Mint asset.
      headers: { 'Idempotency-Key': `object-thumbnail:${object.id}:${thumbnail.id}` },
      body: zUploadReferenceImageBody.parse({
        base64Data: bytes.toString('base64'),
        fileName: thumbnail.filename ?? `${object.id}-thumbnail`,
        contentType: thumbnail.mimeType ?? undefined,
      }),
      throwOnError: true,
    })
    return data.thumbnailUrl ?? undefined
  } catch (error) {
    req.payload.logger.warn({
      msg: 'Object thumbnail reference skipped',
      objectId: object.id,
      error,
    })
    return undefined
  }
}

export const objectModelGenerationEndpoints: Endpoint[] = [
  {
    path: '/create-for-model',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const parsed = z
        .object({
          name: z.string().trim().min(1).max(200),
          description: z.string().trim().max(500).optional(),
        })
        .safeParse(await req.json?.())
      if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })
      const object = await req.payload.create({
        collection: 'objects',
        data: parsed.data,
        req,
        overrideAccess: false,
        context: { skipMintModelGeneration: true },
      })
      return Response.json(object, { status: 201 })
    },
  },
  {
    path: '/:id/generate-model',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const objectId = String(req.routeParams?.id ?? '')
      const object = await req.payload.findByID({
        collection: 'objects',
        id: objectId,
        depth: 0,
        req,
        overrideAccess: false,
      })
      // Any signed-in user may generate a missing model, but only the owner
      // (the collection's own update rule, reused via docAccessOperation) may
      // steer it. Everyone else gets a model derived solely from what the
      // object document already says, so a non-owner can't turn the object
      // into something else through prompts, reference images or revisions.
      const permissions = await docAccessOperation({
        collection: req.payload.collections.objects,
        id: object.id,
        req,
      })
      const canSteer = Boolean(permissions.update)
      const parsed = modelGenerationCommand.safeParse(await req.json?.())
      if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })
      if (!canSteer && parsed.data.action === 'revise') {
        return Response.json(
          { error: 'Only the object owner can revise a generated preview' },
          { status: 403 },
        )
      }
      // Non-owners' client `generation` (prompt, reference images) is dropped;
      // it is rebuilt below from the object document once the job is new.
      let command =
        !canSteer && parsed.data.action === 'start'
          ? { ...parsed.data, generation: undefined }
          : parsed.data
      const requestedBy = String(req.user.id)
      const existing = await req.payload.find({
        collection: 'payload-jobs',
        depth: 0,
        limit: 1,
        sort: '-createdAt',
        req,
        where: {
          and: [
            { workflowSlug: { in: [...MODEL_WORKFLOWS] } },
            { 'input.objectId': { equals: object.id } },
            { 'input.requestedBy': { equals: requestedBy } },
            {
              or: [
                { 'input.requestId': { equals: command.requestId } },
                { and: [{ completedAt: { exists: false } }, { hasError: { not_equals: true } }] },
              ],
            },
          ],
        },
      })
      if (existing.docs[0]) return Response.json(existing.docs[0], { status: 202 })
      if (!canSteer && command.action === 'start') {
        // Only after dedupe, so a repeated request never re-uploads to Mint.
        const imageUrl = await objectThumbnailReference(req, object)
        command = {
          ...command,
          generation: zGenerateModelBody.parse({
            prompt: objectGenerationPrompt(object),
            ...(imageUrl ? { imageUrl } : {}),
          }),
        }
      }
      let operationId: string | undefined
      let prompt = command.action === 'start' ? command.generation?.prompt : undefined
      if (command.action !== 'start') {
        const preview = (await req.payload.findByID({
          collection: 'payload-jobs',
          id: command.previewJobId,
          depth: 0,
          req,
          overrideAccess: false,
        })) as Job<'interactiveObjectModel'>
        if (
          preview.workflowSlug !== 'interactiveObjectModel' ||
          preview.input.objectId !== object.id ||
          !preview.completedAt ||
          preview.hasError
        ) {
          return Response.json({ error: 'Preview is not ready' }, { status: 409 })
        }
        operationId =
          preview.taskStatus.pollMintModelOperation?.['wait-preview']?.output.mintOperationId
        prompt = preview.taskStatus.loadObjectGenerationContext?.['load-context']?.output.prompt
        if (!operationId)
          return Response.json({ error: 'Missing preview operation' }, { status: 409 })
      }
      const common = { objectId: object.id, requestedBy, requestId: command.requestId, prompt }
      const job =
        command.action === 'approve'
          ? await req.payload.jobs.queue({
              workflow: 'finalizeObjectModel',
              queue: INTERACTIVE_MODEL_QUEUE,
              input: { ...common, previewJobId: command.previewJobId, operationId: operationId! },
            })
          : await req.payload.jobs.queue({
              workflow: 'interactiveObjectModel',
              queue: INTERACTIVE_MODEL_QUEUE,
              input: { ...common, ...command, operationId },
            })
      return Response.json(job, { status: 202 })
    },
  },
]
