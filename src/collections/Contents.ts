import { CollectionConfig, SelectField } from 'payload'

const DifficultyField: SelectField = {
  name: 'difficulty',
  type: 'select',
  options: [
    {
      label: 'Easy',
      value: 'easy',
    },
    {
      label: 'Medium',
      value: 'medium',
    },
    {
      label: 'Hard',
      value: 'hard',
    },
  ],
  required: true,
}

export const Contents: CollectionConfig = {
  slug: 'contents',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      unique: true,
      localized: true,
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      localized: true,
    },
    {
      name: 'duration',
      type: 'number',
      virtual: true,
    },
    {
      name: 'copyright',
      type: 'text',
      required: true,
    },
    DifficultyField,
    {
      name: 'images',
      type: 'relationship',
      relationTo: 'contentImages',
      hasMany: true,
      required: false,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'objects',
      type: 'join',
      collection: 'objects',
      on: 'contents',
      hasMany: false,
      required: true,
    },
  ],
}

export const ContentImages: CollectionConfig = {
  slug: 'contentImages',
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
