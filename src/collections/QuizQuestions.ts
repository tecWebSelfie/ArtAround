import { DifficultyField } from '@/fields/DifficultyField'
import { editorial } from '@/fields/editorial'
import { detachDeletedQuestionFromTours } from '@/lib/quiz-ownership'
import { authenticated, isSuperAdmin } from '@/access/museumRoles'
import type { Access, CollectionConfig, FieldAccess } from 'payload'

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
 * limited to their writer and the quiz page sends a reduced, shuffled payload with opaque
 * option keys (phase 2). Keep it out of public endpoints (MCP, search, the
 * public `/localized` read — registered as `serverOnly` in `autoTranslatePlugin`).
 */
/**
 * Same ownership model as tours and contents: any signed-in user writes
 * questions for their own tours, and only the writer (or a super admin) can
 * read them back, since a question carries its answer. Quiz pages read
 * questions through the Local API, which is not limited by these rules.
 */
const writerOrSuperAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  return { createdBy: { equals: req.user.id } }
}

/**
 * Field-level twin of `writerOrSuperAdmin` for the answer fields. Payload does
 * not apply a related collection's read rule to a `where` that walks through
 * it (`GET /api/tours?where[quiz.questions.correctAnswer][equals]=...` would
 * tell a right guess from a wrong one), but it does check *field* read access
 * on every queried path. That check runs without a document, so a rule that
 * needs `doc` (the writer) is false for queries, while a real read, which has
 * the document, still lets the writer see the answer. Super admins pass both.
 */
const answerReadAccess: FieldAccess = ({ req, doc }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const createdBy = (doc as { createdBy?: unknown } | undefined)?.createdBy
  const writerId =
    createdBy && typeof createdBy === 'object' ? (createdBy as { id?: unknown }).id : createdBy
  return writerId != null && String(writerId) === String(req.user.id)
}

export const QuizQuestions: CollectionConfig = {
  slug: QUIZ_QUESTIONS_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'prompt',
    group: 'Quiz',
    defaultColumns: ['prompt', 'relatedTo', 'difficulty'],
  },
  access: {
    read: writerOrSuperAdmin,
    create: authenticated,
    update: writerOrSuperAdmin,
    delete: writerOrSuperAdmin,
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
    editorial({
      name: 'correctAnswer',
      type: 'text',
      required: true,
      access: { read: answerReadAccess },
    }),
    {
      name: 'wrongAnswers',
      type: 'array',
      minRows: 3,
      maxRows: 3,
      required: true,
      access: { read: answerReadAccess },
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
