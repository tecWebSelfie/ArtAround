import { CollectionConfig } from 'payload'

export const Objects: CollectionConfig = {
  slug: 'objects',
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
