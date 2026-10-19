import type { ArrayField, CollectionConfig, JSONField } from 'payload'
import { OpeningHours } from '../fields/OpeningHours'
import { TicketInfo } from '../fields/TicketInfo'

import { Coordinates } from '@/fields/Coordinates'
import { editorial } from '@/fields/editorial'
import { SocialLinks } from '@/fields/SocialLinks'
import navMeshSchema from '@/lib/schemas/navmesh.schema.json'
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
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    editorial({ name: 'description', type: 'richText', required: false }),
    editorial({ name: 'shortDescription', type: 'text', required: true, maxLength: 100 }),
    {
      name: 'accessibility',
      type: 'checkbox',
      virtual: true,
      required: true,
      // da rivedere quando si implementerà il modello dati per la mappa del museo
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
      name: 'exhibits',
      type: 'relationship',
      relationTo: 'exhibits',
      hasMany: true,
      maxDepth: 1,
    },
    {
      name: 'objects',
      type: 'relationship',
      relationTo: 'objects',
      hasMany: true,
      virtual: 'exhibits.objects',
      required: false,
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

function museumService(services: 'bathrooms' | 'food' | 'shop' | 'infoPoint'): ArrayField {
  return {
    name: services,
    type: 'array',
    fields: [OpeningHours, Coordinates],
  }
}
