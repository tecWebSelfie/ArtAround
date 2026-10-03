import { editorial } from '@/fields/editorial'
import { CollectionConfig } from 'payload'

export const Objects: CollectionConfig = {
  slug: 'objects',
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
  ],
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
