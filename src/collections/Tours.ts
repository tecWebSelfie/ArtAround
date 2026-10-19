import type { CollectionConfig } from 'payload'

import { editorial } from '@/fields/editorial'
import { pricingField } from '@/fields/PricingField'

export const TOURS_COLLECTION_SLUG = 'tours'

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  fields: [
    editorial({ name: 'title', type: 'text', required: true }),
    editorial({ name: 'body', type: 'richText', required: false }),
    {
      name: 'description',
      type: 'text',
      required: false,
      maxLength: 70,
    },
    {
      name: 'contents',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      minRows: 1,
      required: true,
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'toursThumbnails',
      required: false,
    },
    {
      name: 'museum',
      type: 'join',
      collection: 'museums',
      on: 'tours',
      hasMany: false,
      required: true,
    },
    {
      name: 'author',
      type: 'join',
      on: 'authoredTours',
      collection: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      required: false,
      min: 1,
      admin: { description: 'Estimated visit length in minutes.' },
    },
    {
      name: 'distanceMeters',
      type: 'number',
      required: false,
      min: 0,
      admin: { description: 'Walking distance of the route, in metres.' },
    },
    {
      name: 'wheelchairAccessible',
      type: 'checkbox',
      required: false,
      defaultValue: false,
      admin: {
        description:
          'The route has a step-free variant. Requires a wheelchair nav mesh on the museum.',
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
    // Price it (leave `priceCents` empty for free) to make it purchasable
    // through `POST /api/checkout`.
    pricingField(),
  ],
}

export const ToursThumbnails: CollectionConfig = {
  slug: 'toursThumbnails',
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
