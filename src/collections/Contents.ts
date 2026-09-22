import { CollectionConfig, SelectField, FieldHook } from 'payload'
import { Content } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { readingTime } from 'reading-time-estimator'

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
      name: 'durationInMinutes',
      type: 'number',
      required: false,
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            siblingData.body
              ? readingTime(convertLexicalToPlaintext({ data: siblingData.body })).minutes
              : undefined,
        ] as FieldHook<Content, number, Content>[],
      },
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
