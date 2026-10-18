import { CollectionConfig, FieldHook } from 'payload'
import { Content } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { readingTime } from 'reading-time-estimator'
import { DifficultyField } from '@/fields/DifficultyField'
import { editorial } from '@/fields/editorial'
import { pricingField } from '@/fields/PricingField'

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
    // Price it (leave `priceCents` empty for free) to make it purchasable
    // through `POST /api/checkout`.
    pricingField(),
  ],
}

export const ContentImages: CollectionConfig = {
  slug: 'contentImages',
  upload: true,
  fields: [editorial({ name: 'alt', type: 'text', required: false })],
}
