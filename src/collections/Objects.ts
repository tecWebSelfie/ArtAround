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
    editorial({ name: 'artist', type: 'text', required: false, maxLength: 120 }),
    editorial({
      name: 'dating',
      type: 'text',
      required: false,
      maxLength: 80,
      admin: { description: 'Free-form date or period, e.g. "c. 1510" or "16th century".' },
    }),
    editorial({
      name: 'provenance',
      type: 'textarea',
      required: false,
      maxLength: 1000,
      admin: { description: 'Ownership history, excavations, donations.' },
    }),
    {
      // Conservation state lives in one block so the (public) state and the
      // internal notes never drift apart.
      name: 'condition',
      type: 'group',
      required: false,
      admin: { description: 'Conservation state and restoration notes for this object.' },
      fields: [
        {
          name: 'state',
          type: 'select',
          required: false,
          options: [
            { label: 'Excellent', value: 'excellent' },
            { label: 'Good', value: 'good' },
            { label: 'Fair', value: 'fair' },
            { label: 'Poor', value: 'poor' },
            { label: 'Under restoration', value: 'restoration' },
          ],
        },
        editorial({
          name: 'notes',
          type: 'textarea',
          required: false,
          maxLength: 500,
          admin: { description: 'Damage, past restorations, handling requirements.' },
        }),
      ],
    },
    editorial({ name: 'creditLine', type: 'text', required: false, maxLength: 200 }),
    {
      name: 'rights',
      type: 'text',
      required: false,
      admin: {
        description:
          'Licence or rights statement for images and reproductions, e.g. "CC BY-SA 4.0".',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'museumCategories',
      hasMany: true,
      required: false,
      index: true,
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
