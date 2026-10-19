import type { CollectionConfig } from 'payload'
import {
  deleteQuestionsOfDeletedTour,
  deleteQuestionsRemovedFromQuiz,
  quizQuestionFilterOptions,
  validateQuizQuestions,
} from '@/lib/quiz-ownership'

export const TOURS_COLLECTION_SLUG = 'tours'

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          // Unnamed tab: keeps the original top-level data shape.
          label: 'Tour',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'description',
              type: 'text',
              required: false,
              maxLength: 70,
            },
            {
              name: 'contents',
              type: 'relationship',
              relationTo: 'contents',
              hasMany: true,
              minRows: 1,
              required: true,
            },
            {
              name: 'thumbnail',
              type: 'upload',
              relationTo: 'toursThumbnails',
              required: false,
            },
            {
              name: 'museum',
              type: 'join',
              collection: 'museums',
              on: 'tours',
              hasMany: false,
              required: true,
            },
            {
              name: 'author',
              type: 'join',
              on: 'authoredTours',
              collection: 'users',
              hasMany: false,
              required: true,
            },
          ],
        },
        {
          // The tour's optional end-of-tour quiz lives inside the tour, so the
          // question picker sees unsaved `contents` and a tour has at most one quiz.
          // An empty list means "no quiz". See `src/lib/quiz-ownership.ts`.
          name: 'quiz',
          label: 'Quiz',
          fields: [
            {
              name: 'questions',
              type: 'relationship',
              relationTo: 'quizQuestions',
              hasMany: true,
              // Never populated, whatever the read depth: tour docs are passed to
              // client components (navigation, tour pages), and a populated question
              // would ship its `correctAnswer` to the browser. Quiz pages read
              // questions separately and send a reduced payload.
              maxDepth: 0,
              filterOptions: quizQuestionFilterOptions,
              validate: validateQuizQuestions,
              admin: {
                description:
                  'Shown in this order after the last stop. Search lists questions about this tour’s contents. Questions created here without related contents belong to this tour: removing them from the quiz deletes them.',
              },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [deleteQuestionsRemovedFromQuiz],
    afterDelete: [deleteQuestionsOfDeletedTour],
  },
}

export const ToursThumbnails: CollectionConfig = {
  slug: 'toursThumbnails',
  upload: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
