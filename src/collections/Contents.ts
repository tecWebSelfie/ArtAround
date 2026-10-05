import { DifficultyField } from '@/fields/DifficultyField'
import { editorial } from '@/fields/editorial'
import { Content } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { CollectionConfig, FieldHook } from 'payload'
import { readingTime } from 'reading-time-estimator'

export const Contents: CollectionConfig = {
  slug: 'contents',
  fields: [
    DifficultyField,
    editorial({ name: 'title', type: 'text', required: true, unique: true }),
    editorial({ name: 'body', type: 'richText', required: true }),
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
      name: 'objects',
      type: 'join',
      collection: 'objects',
      on: 'contents',
      hasMany: false,
      required: true,
    },
    {
      name: 'author',
      type: 'join',
      collection: 'users',
      on: 'authoredContents',
      hasMany: false,
      required: true,
    },
  ],
}

export const ContentImages: CollectionConfig = {
  slug: 'contentImages',
  upload: true,
  fields: [editorial({ name: 'alt', type: 'text', required: false })],
}
