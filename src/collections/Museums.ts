import { ArrayField, CollectionConfig } from 'payload'
import { OpeningHours } from '../fields/OpeningHours'
import { TicketInfo } from '../fields/TicketInfo'

import { phoneNumberField } from 'payload-phone-number-plugin'
import { SocialLinks } from '@/fields/SocialLinks'
import { Coordinates } from '@/fields/Coordinates'

export const Museums: CollectionConfig = {
  slug: 'museums',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
      maxLength: 500,
    },
    {
      name: 'shortDescription',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'accessibility',
      type: 'checkbox',
      virtual: true,
      required: true,
      // da rivedere quando si implementerà il modello dati per la mappa del museo
    },
    {
      name: 'map',
      type: 'relationship',
      relationTo: 'museumMaps',
      hasMany: false,
      required: false,
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
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
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
  ],
}

export const MuseumThumbnails: CollectionConfig = {
  slug: 'museumThumbnails',
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      defaultValue: 'Museum thumbnail image',
    },
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
