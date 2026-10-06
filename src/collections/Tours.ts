import type { CollectionConfig } from 'payload'

export const TOURS_COLLECTION_SLUG = 'tours'

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
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
