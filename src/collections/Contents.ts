import { CollectionConfig, FieldHook } from 'payload'
import { Content } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { readingTime } from 'reading-time-estimator'
import { DifficultyField } from '@/fields/DifficultyField'

export const Contents: CollectionConfig = {
  slug: 'contents',
  fields: [
    DifficultyField,
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
      name: 'readingTimeMins',
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
