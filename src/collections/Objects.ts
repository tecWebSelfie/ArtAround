import { editorial } from '@/fields/editorial'
import { Object } from '@/payload-types'
import { CollectionAfterChangeHook, CollectionConfig } from 'payload'

export const Objects: CollectionConfig = {
  slug: 'objects',
  fields: [
    editorial({ name: 'name', type: 'text', required: true }),
    editorial({ name: 'description', type: 'textarea', required: false, maxLength: 500 }),
    {
      name: 'exhibit',
      type: 'join',
      collection: 'exhibits',
      on: 'objects',
      hasMany: false,
      required: false,
    },
    {
      name: 'contents',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      required: false,
      minRows: 1,
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'objectsThumbnails',
      required: false,
    },
    {
      name: 'model',
      type: 'upload',
      relationTo: 'objectsModels',
      required: false,
    },
  ],
  hooks: {
    afterChange: [
      async ({ req, doc, previousDoc, operation, context }) => {
        // The workflow's persist step links the model back onto the object —
        // that update must not requeue this hook.
        if (context.skipMintModelGeneration) return
        //starts model generation after object creation or update
        if (operation === 'create' || operation === 'update') {
          //skip if name and description are unchanged
          if (
            doc.name === previousDoc.name &&
            doc.description === previousDoc.description &&
            doc.thumbnail === previousDoc.thumbnail
          ) {
            return
          }
          //skip if model already exists and was intentionally uploaded by user
          if (doc.model && doc.model !== previousDoc.model) return

          req.payload.jobs.queue({
            workflow: 'generateObjectModel',
            input: {
              objectId: String(doc.id),
            },
            req,
          })
        }
      },
    ] satisfies CollectionAfterChangeHook<Object>[],
  },
  endpoints: [
    {
      // Manual trigger (e.g. admin button / future editor modal): force-queue
      // a generation for this object. The workflow re-checks everything
      // (user-uploaded models are never overwritten) server-side; the prompt
      // is derived from the object's editorial fields, never from the client.
      method: 'post',
      path: '/:id/generate-model',
      handler: async (req) => {
        if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const id = String(req.routeParams?.id ?? '')
        if (!id) return Response.json({ error: 'Missing object id' }, { status: 400 })
        const job = await req.payload.jobs.queue({
          workflow: 'generateObjectModel',
          req,
          input: { objectId: id },
        })
        return Response.json({ jobId: job.id }, { status: 202 })
      },
    },
  ],
}

export const ObjectsThumbnails: CollectionConfig = {
  slug: 'objectsThumbnails',
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}

export const ObjectsModels: CollectionConfig = {
  slug: 'objectsModels',
  upload: {
    mimeTypes: ['model/gltf-binary'],
  },
  fields: [
    {
      name: 'userGenerated',
      type: 'checkbox',
      required: true,
      // Manual uploads are human by definition; the Mint workflow sets
      // `false` explicitly on the docs it creates.
      defaultValue: true,
    },
    {
      name: 'mintModelId',
      type: 'text',
      // Accounting trail: which Mint asset produced this file.
      required: false,
    },
    {
      name: 'mintOperationId',
      type: 'text',
      // Accounting trail: which Mint operation (and thus which poll/log entry)
      // generated it.
      required: false,
    },
    {
      name: 'thumbnail',
      type: 'relationship',
      relationTo: 'objectsThumbnails',
    },
  ],
}
