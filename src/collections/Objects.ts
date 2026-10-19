import {
  anyone,
  authenticated,
  isSuperAdmin,
  museumsWithRank,
  superAdminOnly,
} from '@/access/museumRoles'
import { editorial } from '@/fields/editorial'
import { MUSEUM_FUNCTION_CURATOR } from '@/fields/MuseumFunction'
import { objectModelGenerationEndpoints } from '@/endpoints/objectModelGeneration'
import { Object } from '@/payload-types'
import type { Access } from 'payload'
import { CollectionAfterChangeHook, CollectionConfig } from 'payload'

/**
 * Objects live in the app catalog independently of any museum: a museum
 * exhibits an object when its map places it (`museums.objects`), and the same
 * object (or a copy of it) may be exhibited by several museums.
 *
 * Curators and directors create objects, and the creator (`createdBy`,
 * filled by the RBAC plugin's `targetCollections` hook) owns it: only the
 * owner edits its data (name, description, media, 3D model). How a museum
 * manages the object — placing, moving or removing it on its map — lives on
 * the museum document and is governed there, so exhibiting staff never need
 * write access to the object itself.
 *
 * Objects are never deleted by museum staff: the catalog doubles as a
 * long-lived database of objects, and an object no museum shows today may be
 * exhibited again. Taking it off a map only removes it from that museum
 * (`museums.objects` is recomputed); deletion is a super-admin operation.
 */
const ownerOrSuperAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  return { createdBy: { equals: String(req.user.id) } }
}

const anyMuseumStaff: Access = async ({ req }) =>
  isSuperAdmin(req) || (await museumsWithRank(req, MUSEUM_FUNCTION_CURATOR)).length > 0

export const Objects: CollectionConfig = {
  slug: 'objects',
  access: {
    read: anyone,
    create: anyMuseumStaff,
    update: ownerOrSuperAdmin,
    delete: superAdminOnly,
  },
  fields: [
    editorial({ name: 'name', type: 'text', required: true }),
    editorial({ name: 'description', type: 'textarea', required: false, maxLength: 500 }),
    {
      // Reverse of the map-derived `museums.objects` index.
      name: 'museums',
      type: 'join',
      collection: 'museums',
      on: 'objects',
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

// Uploads: public assets of a public catalog, created by any logged-in editor.
const uploadAccess = {
  read: anyone,
  create: authenticated,
  update: superAdminOnly,
  delete: superAdminOnly,
}

export const ObjectsThumbnails: CollectionConfig = {
  slug: 'objectsThumbnails',
  upload: true,
  access: uploadAccess,
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
  access: uploadAccess,
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
