import { superAdminOnly } from '@/access/museumRoles'
import { DifficultyField } from '@/fields/DifficultyField'
import type { CollectionConfig } from 'payload'

/**
 * Extra texts attached to a content or an object, shown inside the visitor's
 * modals. Two kinds:
 *
 * - `more`: an addition written after the original text ("Tell me more",
 *   "Curiosities", "Its story"). It can belong to a content or an object.
 * - `version`: the same content rewritten for another difficulty, reading
 *   time or audience ("Simpler", "Shorter", "For children").
 *
 * They are generated on demand by `/api/expand` and saved, so the next visitor
 * gets them instantly. The `body` is localized: the Italian and English texts
 * of one variant are locales of the same document. Staff can also write
 * variants by hand; `generation.generated` is the only place telling the two
 * apart (the visitor sees no difference).
 *
 * Visitors never read this collection through REST: `/api/expand` reads it on
 * their behalf after checking they may read the original content (a paid,
 * locked content gets no variants). That keeps the paid-content rule in one
 * place, so the collection itself is super-admin only.
 */
export const ContentVariants: CollectionConfig = {
  slug: 'contentVariants',
  admin: {
    useAsTitle: 'kind',
    defaultColumns: ['kind', 'angle', 'content', 'object', 'difficulty', 'readingTimeMins'],
  },
  access: {
    read: superAdminOnly,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Addition ("Tell me more")', value: 'more' },
        { label: 'Version (other level or length)', value: 'version' },
      ],
    },
    // Exactly one of `content` / `object` is set: what the text is about.
    { name: 'content', type: 'relationship', relationTo: 'contents', index: true },
    { name: 'object', type: 'relationship', relationTo: 'objects', index: true },
    {
      // Only for `more`: which button produced it.
      name: 'angle',
      type: 'select',
      options: [
        { label: 'Tell me more', value: 'more' },
        { label: 'Curiosities', value: 'curiosities' },
        { label: 'Its story', value: 'story' },
      ],
      admin: { condition: (data) => data?.kind === 'more' },
    },
    // Only for `version`: the properties the visitor asked for.
    {
      // Same options as a content's difficulty, but optional here; not spread
      // from DifficultyField, whose `interfaceName` would make the shared
      // `Difficulty` type nullable everywhere.
      name: 'difficulty',
      type: 'select',
      options: DifficultyField.options,
      admin: { condition: (data) => data?.kind === 'version' },
    },
    {
      name: 'audience',
      type: 'select',
      options: [
        { label: 'Everyone', value: 'everyone' },
        { label: 'Children', value: 'children' },
      ],
      admin: { condition: (data) => data?.kind === 'version' },
    },
    {
      name: 'readingTimeMins',
      type: 'number',
      admin: { condition: (data) => data?.kind === 'version' },
    },
    // Localized, but not registered for auto-translation: each language is
    // written directly in that language by `/api/expand`.
    { name: 'body', type: 'richText', required: true, localized: true },
    {
      // Metadata only: never shown to visitors (course requirement: generated
      // and human texts look the same and differ only here).
      name: 'generation',
      type: 'group',
      fields: [
        { name: 'generated', type: 'checkbox', defaultValue: false },
        { name: 'model', type: 'text' },
        {
          // External pages the text drew on (Wikidata, Wikipedia).
          name: 'sources',
          type: 'array',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'url', type: 'text' },
          ],
        },
      ],
    },
  ],
}
