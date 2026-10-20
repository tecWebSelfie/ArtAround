import type {
  ArrayField,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  JSONField,
  PayloadRequest,
} from 'payload'
import { OpeningHours } from '../fields/OpeningHours'
import { TicketInfo } from '../fields/TicketInfo'

import { Coordinates } from '@/fields/Coordinates'
import { editorial } from '@/fields/editorial'
import { SocialLinks } from '@/fields/SocialLinks'
import { museumRelationIds, refreshSearchDocs } from '@/lib/search-index'
import navMeshSchema from '@/lib/schemas/navmesh.schema.json'
import type { Museum } from '@/payload-types'
import { getPermissionAccess } from '@zealamic/payload-plugin-rbac'
import { phoneNumberField } from 'payload-phone-number-plugin'

export const Museums: CollectionConfig = {
  slug: 'museums',
  access: {
    // The catalog is public; editing uses the existing RBAC permission matrix.
    read: () => true,
    create: getPermissionAccess({ featureCode: 'Museum', actionCode: 'Create' }),
    update: getPermissionAccess({
      featureCode: 'Museum',
      actionCode: 'Update',
      collectionSlug: 'museums',
      mode: 'modify',
    }),
    delete: getPermissionAccess({
      featureCode: 'Museum',
      actionCode: 'Delete',
      collectionSlug: 'museums',
      mode: 'modify',
    }),
  },
  hooks: {
    // The search plugin re-indexes the museum itself. Tours/objects embed the
    // museum name and city in their search text, so refresh those dependent
    // rows whenever museum metadata or relationships change.
    afterChange: [refreshMuseumAfterChange],
    afterDelete: [refreshMuseumAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    editorial({ name: 'description', type: 'richText', required: false }),
    editorial({ name: 'shortDescription', type: 'text', required: true, maxLength: 100 }),
    {
      // Accessibility is one admin block: a single flag used for catalog
      // filters plus the features shown on the museum page and the wheelchair
      // route (`navMeshWheelchair`). The old virtual checkbox persisted
      // nothing, so `accessibility.isAccessible` is the new source of truth.
      name: 'accessibility',
      type: 'group',
      required: false,
      admin: {
        description: 'Step-free access and the services available to visitors with disabilities.',
      },
      fields: [
        {
          name: 'isAccessible',
          type: 'checkbox',
          required: true,
          defaultValue: false,
          index: true,
          admin: {
            description: 'Step-free access to the main visit route (used for catalog filters).',
          },
        },
        { name: 'stepFreeEntrance', type: 'checkbox', defaultValue: false },
        { name: 'elevator', type: 'checkbox', defaultValue: false },
        { name: 'accessibleBathrooms', type: 'checkbox', defaultValue: false },
        { name: 'tactilePaths', type: 'checkbox', defaultValue: false },
        { name: 'audioGuides', type: 'checkbox', defaultValue: false },
        { name: 'signLanguage', type: 'checkbox', defaultValue: false },
        { name: 'serviceAnimals', type: 'checkbox', defaultValue: false },
        editorial({ name: 'notes', type: 'textarea', required: false, maxLength: 500 }),
      ],
    },
    phoneNumberField({
      name: 'phone',
      required: false,
    }),
    {
      name: 'email',
      type: 'email',
      required: false,
    },
    SocialLinks,
    {
      name: 'news',
      type: 'array',
      required: false,
      fields: [
        editorial({ name: 'title', type: 'text', required: true }),
        editorial({ name: 'content', type: 'textarea', required: true }),
        {
          name: 'date',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'thumbnails',
      type: 'upload',
      relationTo: 'museumThumbnails',
      hasMany: true,
      required: false,
      minRows: 1,
      maxRows: 6,
    },
    {
      // Museums own their objects directly. This used to be a virtual field
      // aggregating `exhibits.objects`; the exhibits collection is gone, so the
      // relationship is explicit and `depth: 2` reads populate it for the UI.
      name: 'objects',
      type: 'relationship',
      relationTo: 'objects',
      hasMany: true,
      required: false,
      index: true,
    },
    OpeningHours,
    TicketInfo,
    {
      name: 'location',
      type: 'group',
      required: true,
      fields: [
        {
          name: 'address',
          type: 'text',
          required: true,
        },
        {
          name: 'city',
          type: 'text',
          required: true,
          index: true,
        },
        {
          name: 'region',
          type: 'text',
          required: false,
        },
        {
          name: 'postalCode',
          type: 'text',
          required: false,
        },
        {
          name: 'country',
          type: 'text',
          required: false,
          defaultValue: 'IT',
          admin: { description: 'ISO 3166-1 alpha-2 code, e.g. "IT".' },
        },
        {
          name: 'latlng',
          type: 'point',
          hidden: true,
          required: true,
        },
      ],
    },
    {
      name: 'services',
      type: 'group',
      required: false,
      fields: [
        museumService('bathrooms'),
        museumService('food'),
        museumService('shop'),
        museumService('infoPoint'),
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'museumCategories',
      hasMany: true,
      required: false,
      index: true,
      admin: {
        description: 'Taxonomy tags used to group and filter the museum catalog.',
      },
    },
    {
      name: 'tours',
      type: 'relationship',
      relationTo: 'tours',
      hasMany: true,
      required: false,
    },
    {
      name: 'map',
      type: 'json', // it is a pascal-editor json map representation
      required: false,
    },
    {
      name: 'navMesh',
      type: 'json',
      required: false,
      jsonSchema: {
        fileMatch: ['*'],
        uri: 'https://artaround.local/schemas/navmesh.json',
        schema: navMeshSchema as NonNullable<JSONField['jsonSchema']>['schema'],
      },
    },
    {
      // Older maps have only the walking mesh until they are saved again.
      name: 'navMeshWheelchair',
      type: 'json',
      required: false,
      jsonSchema: {
        fileMatch: ['*'],
        uri: 'https://artaround.local/schemas/navmesh-wheelchair.json',
        schema: navMeshSchema as NonNullable<JSONField['jsonSchema']>['schema'],
      },
    },
  ],
}

export const MuseumThumbnails: CollectionConfig = {
  slug: 'museumThumbnails',
  upload: true,
  fields: [
    editorial({
      name: 'alt',
      type: 'text',
      required: true,
      defaultValue: 'Museum thumbnail image',
    }),
  ],
}

export const MuseumMaps: CollectionConfig = {
  slug: 'museumMaps',
  upload: true,
  fields: [],
}

/**
 * Refreshes the search rows of a museum's tours and objects. `previousDoc` is
 * included so a relation removed by this save is refreshed as well; otherwise a
 * tour that moved to another museum would keep the old city in the index.
 */
async function refreshMuseumDependents({
  doc,
  previousDoc,
  req,
}: {
  doc: Museum
  previousDoc?: Museum
  req: PayloadRequest
}) {
  const tourIds = [...museumRelationIds(doc, 'tours'), ...museumRelationIds(previousDoc, 'tours')]
  const objectIds = [
    ...museumRelationIds(doc, 'objects'),
    ...museumRelationIds(previousDoc, 'objects'),
  ]

  try {
    await Promise.all([
      refreshSearchDocs({ payload: req.payload, collection: 'tours', ids: tourIds, req }),
      refreshSearchDocs({ payload: req.payload, collection: 'objects', ids: objectIds, req }),
    ])
  } catch (error) {
    // Search is derived data: a failure here must not roll back the museum save.
    req.payload.logger.error({
      err: error,
      msg: `Could not refresh dependent search rows for museum ${doc.id}`,
    })
  }
}

async function refreshMuseumAfterChange(args: Parameters<CollectionAfterChangeHook<Museum>>[0]) {
  await refreshMuseumDependents(args)
  return args.doc
}

async function refreshMuseumAfterDelete(args: Parameters<CollectionAfterDeleteHook<Museum>>[0]) {
  await refreshMuseumDependents({ doc: args.doc, req: args.req })
  return args.doc
}

function museumService(services: 'bathrooms' | 'food' | 'shop' | 'infoPoint'): ArrayField {
  return {
    name: services,
    type: 'array',
    fields: [OpeningHours, Coordinates],
  }
}
