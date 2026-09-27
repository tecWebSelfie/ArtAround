import { CollectionConfig } from 'payload'
import { editorial } from '@/fields/editorial'

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
  ],
}
