import { isSuperAdmin, superAdminOnly } from '@/access/museumRoles'
import type { CollectionConfig } from 'payload'

/**
 * Read-aloud MP3 of a content's base text or saved version, one per locale
 * (`src/lib/content-audio.ts`). Written only by the `generateContentAudio`
 * task with Local API privileges; visitors never read this collection or its
 * files directly: `/api/content-audio/[id]` streams the file to whoever can
 * read the content's body, so a paid content's audio stays as locked as its
 * text.
 */
export const ContentAudio: CollectionConfig = {
  slug: 'contentAudio',
  admin: {
    group: 'Contents',
    defaultColumns: ['content', 'locale', 'durationSeconds', 'updatedAt'],
  },
  upload: { mimeTypes: ['audio/mpeg'] },
  access: {
    read: ({ req }) => isSuperAdmin(req),
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  // A nullable variant preserves old base recordings while isolating personal versions.
  indexes: [{ fields: ['content', 'locale', 'variant'], unique: true }],
  fields: [
    { name: 'content', type: 'relationship', relationTo: 'contents', required: true, index: true },
    { name: 'locale', type: 'text', required: true },
    { name: 'variant', type: 'relationship', relationTo: 'contentVariants' },
    {
      // Fingerprint of the text read (`audioTextHash`): a mismatch with the
      // current text means the audio is stale and must be generated again.
      name: 'textHash',
      type: 'text',
      required: true,
    },
    // Real length of the audio, measured from its MP3 frames.
    { name: 'durationSeconds', type: 'number', min: 0 },
    // Metadata only, like `contentVariants.generation`: the voice is synthetic.
    { name: 'model', type: 'text' },
    { name: 'voice', type: 'text' },
  ],
}
