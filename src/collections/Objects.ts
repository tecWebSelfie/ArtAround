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
import type { Access, RelationshipFieldValidation } from 'payload'
import { extractID, relationship } from 'payload/shared'
import { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { imageUpload } from '../fields/imageUpload'

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

/**
 * A content is about exactly one object: it may appear in the `contents` of at
 * most one object (`contents.objects` is a single-object join, and navigation
 * routes a content to "its" object). Saving an object that lists a content
 * already attached elsewhere is rejected with the other object's name, so the
 * editor detaches it there first instead of silently moving it.
 */
const validateExclusiveContents: RelationshipFieldValidation = async (value, options) => {
  const base = await relationship(value, options)
  if (base !== true) return base
  const { req, id } = options
  const selected = (Array.isArray(value) ? value : value ? [value] : [])
    .map((entry) => String(extractID(entry as never)))
    .filter(Boolean)
  if (!selected.length || !req?.payload) return true
  const { docs } = await req.payload.find({
    collection: 'objects',
    where: {
      and: [{ contents: { in: selected } }, ...(id ? [{ id: { not_equals: id } }] : [])],
    },
    select: { name: true },
    depth: 0,
    limit: 1,
    req,
  })
  const other = docs[0]
  return other
    ? `A content can belong to one object only: one of these is already attached to "${other.name}".`
    : true
}

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
      // The authored object → content relation (ordered). Exclusive per
      // content: see `validateExclusiveContents`.
      name: 'contents',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      required: false,
      minRows: 1,
      validate: validateExclusiveContents,
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
  // Card and cover widths derived on upload (src/fields/imageUpload.ts).
  upload: imageUpload,
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
