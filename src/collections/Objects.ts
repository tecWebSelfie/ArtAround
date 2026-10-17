import { editorial } from '@/fields/editorial'
import { objectModelGenerationEndpoints } from '@/endpoints/objectModelGeneration'
import { Object } from '@/payload-types'
import { getPermissionAccess } from '@zealamic/payload-plugin-rbac/utils'
import { CollectionAfterChangeHook, CollectionConfig } from 'payload'

export const Objects: CollectionConfig = {
  slug: 'objects',
  access: {
    // The catalog is public; editing uses the existing RBAC permission matrix.
    read: () => true,
    create: getPermissionAccess({ featureCode: 'Object', actionCode: 'Create' }),
    update: getPermissionAccess({
      featureCode: 'Object',
      actionCode: 'Update',
      collectionSlug: 'objects',
      mode: 'modify',
    }),
    delete: getPermissionAccess({
      featureCode: 'Object',
      actionCode: 'Delete',
      collectionSlug: 'objects',
      mode: 'modify',
    }),
  },
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
            doc.name === previousDoc?.name &&
            doc.description === previousDoc?.description &&
            doc.thumbnail === previousDoc?.thumbnail
          ) {
            return
          }
          //skip if model already exists and was intentionally uploaded by user
          if (doc.model && doc.model !== previousDoc?.model) return

          await req.payload.jobs.queue({
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
  endpoints: objectModelGenerationEndpoints,
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
