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
