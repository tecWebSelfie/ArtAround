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
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Where,
} from 'payload'
import { nonCommercialConflicts } from '@/lib/content-rights'
import { hideFromSearch, readTours, VISIBILITY_OPTIONS } from '@/lib/visibility'
import { keptDirections } from '@/lib/tour-logistics'
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
  if (operation !== 'create' || !req.user) return data
  // Super admins may author a tour for someone else from the admin, except a
  // visit copy: that is always its creator's own (`existingVisitCopy` finds
  // it by author to reopen it instead of copying again).
  if (!isSuperAdmin(req) || data.visitCopyOf) data.author = req.user.id
  return data
}

/**
 * What a tour may include, checked whenever its stops (or visibility) change,
 * with one read of the stops (`src/lib/content-rights.ts`, `visibility.ts`):
 * - a tour that sells contents is commercial use of everything in it, so it
 *   can't include an NC-licensed content of another author;
 * - a public tour can't include private contents: its visitors couldn't read
 *   them. Private tours (a class visit) may mix both.
 * A later price change of a stop doesn't re-check its tours.
 */
const guardTourContents: CollectionBeforeChangeHook<TourType> = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data.contents && !data.visibility) return data
  const contents = data.contents ?? originalDoc?.contents
  if (!contents?.length) return data
  const author = data.author ?? originalDoc?.author
  const visibility = data.visibility ?? originalDoc?.visibility
  const { docs } = await req.payload.find({
    collection: 'contents',
    where: { id: { in: contents.map(asId).filter(Boolean) } },
    select: { title: true, price: true, license: true, author: true, visibility: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const quote = (list: { title: string }[]) => list.map(({ title }) => `"${title}"`).join(', ')
  const conflicts = nonCommercialConflicts(
    docs.map((doc) => ({ ...doc, author: asId(doc.author) })),
    author ? asId(author) : null,
  )
  if (conflicts.length) {
    throw new APIError(
      `A tour with paid contents can't include non-commercial (NC) contents of other authors: ${quote(conflicts)}.`,
      400,
    )
  }
  const hidden = visibility === 'private' ? [] : docs.filter((doc) => doc.visibility === 'private')
  if (hidden.length) {
    throw new APIError(
      `A public tour can't include private contents: ${quote(hidden)}. Make the tour private or the contents public.`,
      400,
    )
  }
  return data
}

/**
 * A stop's directions leave with the stop: removing a content from the tour
 * drops its note, so a later re-add starts without a stale one.
 */
const pruneDirections: CollectionBeforeChangeHook<TourType> = ({ data, originalDoc }) => {
  if (!data.contents && !data.directions) return data
  const contents = data.contents ?? originalDoc?.contents ?? []
  data.directions = keptDirections(data.directions ?? originalDoc?.directions, contents)
  return data
}

/**
 * A visit copy (`visitCopyOf`) is one visitor's tour, followed at most by
 * their group: always private, whatever the form sent. Before
 * `guardTourContents`, so a copy of a tour with private stops saves.
 */
const keepVisitCopyPrivate: CollectionBeforeChangeHook<TourType> = ({ data, originalDoc }) => {
  // The saved value wins over the stored one, a cleared (null) one included.
  const copyOf = 'visitCopyOf' in data ? data.visitCopyOf : originalDoc?.visitCopyOf
  if (copyOf) data.visibility = 'private'
  return data
}

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  // `existingVisitCopy`: a visitor's latest copy of a tour, in one index seek.
  indexes: [{ fields: ['author', 'visitCopyOf', 'updatedAt'] }],
  access: {
    // Private tours only for their author and the guests of their group visits.
    read: readTours,
    create: authenticated,
    update: authorOrSuperAdmin,
    delete: authorOrMuseumDirector,
  },
  hooks: {
    beforeChange: [assignAuthor, keepVisitCopyPrivate, guardTourContents, pruneDirections],
    // Tour-owned quiz questions live and die with the tour (src/lib/quiz-ownership.ts).
    afterChange: [deleteQuestionsRemovedFromQuiz, hideFromSearch('tours')],
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
            // Logistic directions (course specification, "ArtAround: Architettura"):
            // not items and not part of any item, so they live on the tour. The
            // visit's practical information comes before the first stop; each
            // stop may say how to reach it from the previous one. Shown in the
            // tour page and in navigation (`src/lib/tour-logistics.ts`).
            editorial({
              name: 'logistics',
              type: 'textarea',
              required: false,
              maxLength: 1000,
              admin: {
                description:
                  'Practical information for the visit: entrance, tickets, cloakroom, opening hours.',
              },
            }),
            {
              name: 'directions',
              type: 'array',
              admin: {
                description:
                  'How to reach a stop from the previous one (from the entrance for the first).',
              },
              fields: [
                {
                  name: 'content',
                  type: 'relationship',
                  relationTo: 'contents',
                  required: true,
                  // Only the id: the stop itself comes from `contents`.
                  maxDepth: 0,
                },
                editorial({ name: 'text', type: 'textarea', required: true, maxLength: 500 }),
              ],
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
              // The tour this one copies for one visitor's visit ("Edit" on a
              // tour's start page; `/tour/new?from=<id>&visit=1`). Copy-on-write:
              // the original never changes. Like a planned visit, the copy is
              // that visitor's own tour: private (`keepVisitCopyPrivate`), never
              // listed (`LISTED_TOURS`), and reopened by "Edit" instead of copied
              // again. Set on create only; never reassigned.
              name: 'visitCopyOf',
              type: 'relationship',
              relationTo: TOURS_COLLECTION_SLUG,
              hasMany: false,
              maxDepth: 0,
              // Indexed with `author` (collection `indexes`), the one query on it.
              access: { update: ({ req }) => isSuperAdmin(req) },
              admin: { position: 'sidebar', readOnly: true },
            },
            {
              // Set only on tours planned from the visitor's form (`/api/plan-tour`).
              // Metadata only: a planned tour reads like any other tour and is
              // reused for later visitors with the same answers, but it is not
              // listed or searched (`LISTED_TOURS`, src/lib/visibility.ts).
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
