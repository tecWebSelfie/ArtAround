import { getPermissionAccess, getSuperAdminAccess } from '@zealamic/payload-plugin-rbac/utils'
import { randomBytes } from 'node:crypto'
import type { Access, CollectionConfig } from 'payload'

export const QUIZ_ATTEMPTS_COLLECTION_SLUG = 'quizAttempts'

/** Unguessable result-link token; ObjectIds are partly predictable (time + counter). */
export function newQuizAttemptToken() {
  return randomBytes(18).toString('base64url')
}

const readStaff = getPermissionAccess({ featureCode: 'Content', actionCode: 'Read' })

/** Staff (Content read) see every attempt for statistics; other users only their own. */
const readAttempts: Access = async ({ req }) => {
  if (!req.user) return false
  if ((await readStaff({ req })) === true) return true
  return { user: { equals: req.user.id } }
}

/**
 * One graded run of a tour quiz, anonymous or by a signed-in user.
 *
 * Attempts are written only by the server-side quiz submit (Local API), which
 * re-grades every choice from the stored questions; REST/GraphQL can never
 * create or edit one. The result page is addressed by `token`, never by `id`.
 * `correctQuestions` duplicates `answers[].correct` on purpose: per-question
 * statistics count it with one plain query, avoiding MongoDB matching
 * `answers.question` and `answers.correct` on different array elements.
 */
export const QuizAttempts: CollectionConfig = {
  slug: QUIZ_ATTEMPTS_COLLECTION_SLUG,
  admin: {
    group: 'Quiz',
    useAsTitle: 'token',
    defaultColumns: ['tour', 'score', 'total', 'locale', 'createdAt'],
  },
  access: {
    read: readAttempts,
    create: () => false,
    update: () => false,
    delete: getSuperAdminAccess,
  },
  fields: [
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      defaultValue: newQuizAttemptToken,
      admin: { readOnly: true },
    },
    { name: 'tour', type: 'relationship', relationTo: 'tours', required: true, index: true },
    // Empty for anonymous visitors; their attempts still feed the statistics.
    { name: 'user', type: 'relationship', relationTo: 'users', required: false },
    { name: 'locale', type: 'text', required: true },
    {
      name: 'stepsCompleted',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description:
          'Tour cursor when the quiz was taken; lower than the stop count means an early quiz.',
      },
    },
    {
      name: 'answers',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'quizQuestions',
          required: true,
          // IDs only: a populated question carries its answer (see Tours.quiz.questions).
          maxDepth: 0,
        },
        {
          name: 'answer',
          type: 'text',
          required: true,
          admin: { description: "'correct' or the ID of the chosen wrong-answer row." },
        },
        { name: 'correct', type: 'checkbox', required: true, defaultValue: false },
      ],
    },
    {
      name: 'correctQuestions',
      type: 'relationship',
      relationTo: 'quizQuestions',
      hasMany: true,
      maxDepth: 0,
    },
    { name: 'score', type: 'number', required: true, min: 0 },
    { name: 'total', type: 'number', required: true, min: 0 },
  ],
}
