import { DifficultyField } from '@/fields/DifficultyField'
import { editorial } from '@/fields/editorial'
import { detachDeletedQuestionFromTours } from '@/lib/quiz-ownership'
import { getPermissionAccess } from '@zealamic/payload-plugin-rbac/utils'
import type { CollectionConfig } from 'payload'

export const QUIZ_QUESTIONS_COLLECTION_SLUG = 'quizQuestions'

/**
 * Multiple-choice questions shown by a tour's end-of-tour quiz (`Tours.quiz`).
 *
 * Ownership is implicit (see `src/lib/quiz-ownership.ts`):
 * - `relatedTo` set   → a question about those contents, reusable by every tour
 *   that includes one of them;
 * - `relatedTo` empty → a tour-specific question, owned by the one tour whose
 *   quiz lists it. Hooks delete it once no tour or content keeps it alive.
 *
 * The answer is never exposed to visitors through this collection: reads are
 * staff-only and the quiz page sends a reduced, shuffled payload with opaque
 * option keys (phase 2). Keep it out of public endpoints (MCP, search, the
 * public `/localized` read — registered as `serverOnly` in `autoTranslatePlugin`).
 */
export const QuizQuestions: CollectionConfig = {
  slug: QUIZ_QUESTIONS_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'prompt',
    group: 'Quiz',
    defaultColumns: ['prompt', 'relatedTo', 'difficulty'],
  },
  access: {
    // Questions carry their answer, so even reads need the staff `Content`
    // permission; visitors only receive them through the quiz page.
    read: getPermissionAccess({ featureCode: 'Content', actionCode: 'Read' }),
    create: getPermissionAccess({ featureCode: 'Content', actionCode: 'Create' }),
    update: getPermissionAccess({
      featureCode: 'Content',
      actionCode: 'Update',
      collectionSlug: QUIZ_QUESTIONS_COLLECTION_SLUG,
      mode: 'modify',
    }),
    delete: getPermissionAccess({
      featureCode: 'Content',
      actionCode: 'Delete',
      collectionSlug: QUIZ_QUESTIONS_COLLECTION_SLUG,
      mode: 'modify',
    }),
  },
  fields: [
    editorial({ name: 'prompt', type: 'textarea', required: true }),
    {
      name: 'image',
      type: 'upload',
      // Reuses content images: same translated `alt`, same editorial assets.
      relationTo: 'contentImages',
      required: false,
    },
    // Exactly four options by construction: one correct + three wrong. Keeping the
    // correct answer in its own field means no "exactly one correct" validator and
    // no index that silently changes meaning when array rows are reordered.
    editorial({ name: 'correctAnswer', type: 'text', required: true }),
    {
      name: 'wrongAnswers',
      type: 'array',
      minRows: 3,
      maxRows: 3,
      required: true,
      // Only the leaf text is localized, so row IDs are shared by every locale
      // and grading by row ID works whatever language the visitor uses.
      fields: [editorial({ name: 'text', type: 'text', required: true })],
    },
    editorial({
      name: 'explanation',
      type: 'textarea',
      admin: { description: 'Shown after the visitor answers. Auto-translated on demand.' },
    }),
    { ...DifficultyField, defaultValue: 'medium' },
    {
      name: 'relatedTo',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description:
          'Contents this question is about. Leave empty for a question specific to the tour whose quiz uses it.',
      },
    },
  ],
  hooks: {
    afterDelete: [({ id, req }) => detachDeletedQuestionFromTours(req, String(id))],
  },
}
