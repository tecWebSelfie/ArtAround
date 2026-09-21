import { CollectionConfig } from 'payload'

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
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'museumThumbnails',
      required: false,
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
    },
  ],
}
