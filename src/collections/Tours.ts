import {
  anyone,
  asId,
  authenticated,
  isSuperAdmin,
  museumsWithRank,
  superAdminOnly,
} from '@/access/museumRoles'
import { MUSEUM_FUNCTION_DIRECTOR } from '@/fields/MuseumFunction'
import type { Tour as TourType } from '@/payload-types'
import {
  APIError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Where,
} from 'payload'
import { nonCommercialConflicts } from '@/lib/content-rights'
import { readTours, removeFromSearch, VISIBILITY_OPTIONS } from '@/lib/visibility'
import {
  deleteQuestionsOfDeletedTour,
  deleteQuestionsRemovedFromQuiz,
  quizQuestionFilterOptions,
  validateQuizQuestions,
} from '@/lib/quiz-ownership'

import { editorial } from '@/fields/editorial'
import { imageUpload } from '../fields/imageUpload'

export const TOURS_COLLECTION_SLUG = 'tours'

/**
 * Tours are user-generated like contents: any logged-in user builds one for a
 * museum, only the author edits it, and the museum's director may remove it.
 * Its price is not stored: it is the sum of the contents the viewer doesn't
 * own yet (`src/lib/price.ts`), so it is computed per viewer.
 */

const authorOrSuperAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  return { author: { equals: req.user.id } }
}

const authorOrMuseumDirector: Access = async ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const directed = await museumsWithRank(req, MUSEUM_FUNCTION_DIRECTOR)
  const or: Where[] = [{ author: { equals: req.user.id } }]
  if (directed.length) or.push({ museum: { in: directed } })
  return { or }
}

const assignAuthor: CollectionBeforeChangeHook<TourType> = ({ data, req, operation }) => {
  if (operation === 'create' && req.user && !isSuperAdmin(req)) data.author = req.user.id
  return data
}

/**
 * A tour that sells contents is commercial use of everything in it, so it
 * can't include an NC-licensed content of another author
 * (`nonCommercialConflicts`, src/lib/content-rights.ts). Checked whenever the
 * stops change; a later price change of a stop doesn't re-check its tours.
 */
const guardNonCommercialContents: CollectionBeforeChangeHook<TourType> = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data.contents) return data
  const author = data.author ?? originalDoc?.author
  const { docs } = await req.payload.find({
    collection: 'contents',
    where: { id: { in: data.contents.map(asId).filter(Boolean) } },
    select: { title: true, price: true, license: true, author: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const conflicts = nonCommercialConflicts(
    docs.map((doc) => ({ ...doc, author: doc.author ? asId(doc.author) : null })),
    author ? asId(author) : null,
  )
  if (conflicts.length) {
    throw new APIError(
      `A tour with paid contents can't include non-commercial (NC) contents of other authors: ${conflicts
        .map(({ title }) => `"${title}"`)
        .join(', ')}.`,
      400,
    )
  }
  return data
}

/**
 * A public tour can't include private contents: its visitors couldn't read
 * them (`src/lib/visibility.ts`). Private tours (a class visit) may mix both.
 */
const guardPrivateContents: CollectionBeforeChangeHook<TourType> = async ({
  data,
  req,
  originalDoc,
}) => {
  const visibility = data.visibility ?? originalDoc?.visibility
  const contents = data.contents ?? originalDoc?.contents
  if (visibility === 'private' || !contents?.length) return data
  const { docs } = await req.payload.find({
    collection: 'contents',
    where: {
      and: [
        { id: { in: contents.map(asId).filter(Boolean) } },
        { visibility: { equals: 'private' } },
      ],
    },
    select: { title: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (docs.length) {
    throw new APIError(
      `A public tour can't include private contents: ${docs.map(({ title }) => `"${title}"`).join(', ')}. Make the tour private or the contents public.`,
      400,
    )
  }
  return data
}

/** A tour that is (or became) private leaves the search index. */
const hideFromSearch: CollectionAfterChangeHook<TourType> = async ({ doc, req }) => {
  if (doc.visibility === 'private') await removeFromSearch(req, 'tours', String(doc.id))
  return doc
}

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  access: {
    // Private tours only for their author and the guests of their group visits.
    read: readTours,
    create: authenticated,
    update: authorOrSuperAdmin,
    delete: authorOrMuseumDirector,
  },
  hooks: {
    beforeChange: [assignAuthor, guardNonCommercialContents, guardPrivateContents],
    // Tour-owned quiz questions live and die with the tour (src/lib/quiz-ownership.ts).
    afterChange: [deleteQuestionsRemovedFromQuiz, hideFromSearch],
    afterDelete: [deleteQuestionsOfDeletedTour],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          // Unnamed tab: keeps the original top-level data shape.
          label: 'Tour',
          fields: [
            // Localized (and machine-translated, `autoTranslatePlugin`) like contents.
            editorial({ name: 'title', type: 'text', required: true }),
            {
              // Private: a class visit only its author and the group's guests see
              // (`src/lib/visibility.ts`); never in search or the marketplace.
              name: 'visibility',
              type: 'select',
              defaultValue: 'public',
              index: true,
              options: [...VISIBILITY_OPTIONS],
            },
            editorial({ name: 'body', type: 'richText', required: false }),
            {
              name: 'description',
              type: 'text',
              required: false,
              maxLength: 70,
            },
            {
              // Authored order = visiting order (see docs/tour-navigation.md).
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
              // Owned by the tour (reverse: `museums.tours` join) so creating a tour
              // never requires editing the museum.
              name: 'museum',
              type: 'relationship',
              relationTo: 'museums',
              hasMany: false,
              required: true,
              index: true,
            },
            {
              // Set from the caller on create (`assignAuthor`); never reassigned.
              name: 'author',
              type: 'relationship',
              relationTo: 'users',
              required: false,
              index: true,
              access: { update: ({ req }) => isSuperAdmin(req) },
            },
            {
              // Set only on tours planned from the visitor's form (`/api/plan-tour`).
              // Metadata only: a planned tour looks like any other tour to visitors,
              // and stays available to later visitors with the same needs.
              name: 'generation',
              type: 'group',
              access: { update: ({ req }) => isSuperAdmin(req) },
              fields: [
                { name: 'generated', type: 'checkbox', defaultValue: false },
                { name: 'model', type: 'text' },
                {
                  // Hash of the normalized form answers: the same answers for the same
                  // museum reuse this tour instead of planning a new one.
                  name: 'requestKey',
                  type: 'text',
                  index: true,
                },
                {
                  // The answers themselves (time, group, interests) can be personal,
                  // so only super admins read them.
                  name: 'request',
                  type: 'json',
                  access: { read: ({ req }) => isSuperAdmin(req) },
                },
              ],
            },
            {
              name: 'durationMinutes',
              type: 'number',
              required: false,
              min: 1,
              admin: { description: 'Estimated visit length in minutes.' },
            },
            {
              name: 'distanceMeters',
              type: 'number',
              required: false,
              min: 0,
              admin: { description: 'Walking distance of the route, in metres.' },
            },
            {
              name: 'wheelchairAccessible',
              type: 'checkbox',
              required: false,
              defaultValue: false,
              admin: {
                description:
                  'The route has a step-free variant. Requires a wheelchair nav mesh on the museum.',
              },
            },
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'museumCategories',
              hasMany: true,
              required: false,
              index: true,
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
}

export const ToursThumbnails: CollectionConfig = {
  slug: 'toursThumbnails',
  // Card and cover widths derived on upload (src/fields/imageUpload.ts).
  upload: imageUpload,
  access: {
    read: anyone,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
