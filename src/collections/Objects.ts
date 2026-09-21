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
  ],
}
