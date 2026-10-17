import {
  INTERACTIVE_MODEL_QUEUE,
  MODEL_WORKFLOWS,
  modelGenerationCommand,
} from '@/lib/model-generation'
import type { Endpoint, Job } from 'payload'
import { z } from 'zod'

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
      const parsed = modelGenerationCommand.safeParse(await req.json?.())
      if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 })
      const command = parsed.data
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
