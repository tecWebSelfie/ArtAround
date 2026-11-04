import { ownsContent } from '@/access/entitlements'
import {
  anyone,
  asId,
  authenticated,
  getMuseumRoles,
  hasRank,
  isSuperAdmin,
  museumIdsForContent,
  museumIdsForObjects,
  objectIdsInMuseums,
  staffIdsWithRank,
  superAdminOnly,
} from '@/access/museumRoles'
import { DifficultyField } from '@/fields/DifficultyField'
import { editorial } from '@/fields/editorial'
import { MUSEUM_FUNCTION_CURATOR, MUSEUM_FUNCTION_VERIFIED } from '@/fields/MuseumFunction'
import {
  DEFAULT_LICENSE,
  effectiveLicense,
  isLicense,
  LICENSE_NAME,
  LICENSES,
} from '@/lib/content-rights'
import { hideFromSearch, readContents, VISIBILITY_OPTIONS } from '@/lib/visibility'
import { richTextFromHtml, richTextHtmlInput } from '@/fields/richTextHtml'
import { detachDeletedContentFromQuestions } from '@/lib/quiz-ownership'
import { refreshSearchDocs } from '@/lib/search-index'
import { Content } from '@/payload-types'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import {
  APIError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type FieldAccess,
  type FieldHook,
  type PayloadRequest,
  type Where,
} from 'payload'
import { AUDIO_QUEUE } from '@/lib/content-audio'
import { estimateSeconds } from '@/lib/duration'
import { imageUpload } from '../fields/imageUpload'

/**
 * Contents are user-generated: any logged-in user writes them, the author is
 * the only editor, and museum staff moderate (delete) them following the
 * museum hierarchy. A positive `price` makes the content paid: its `body` is
 * then readable only by people entitled to it (`canReadPaidBody`), enforced at
 * field level so REST, the localized endpoint and server pages all agree.
 */

// Seconds to read the body aloud (`src/lib/duration.ts`); undefined without a body.
const estimatedSeconds = (body: Content['body'] | undefined) =>
  body ? estimateSeconds(convertLexicalToPlaintext({ data: body })) || undefined : undefined

const canReadPaidBody: FieldAccess<Content> = async ({ req, doc }) => {
  if (!doc?.price) return true
  if (isSuperAdmin(req)) return true
  if (!req.user) return false
  if (asId(doc.author) === String(req.user.id)) return true
  // Staff of a museum exhibiting the content's objects can review it.
  const [museums, roles] = await Promise.all([
    museumIdsForContent(req, String(doc.id)),
    getMuseumRoles(req),
  ])
  if (museums.some((id) => hasRank(roles.get(id), MUSEUM_FUNCTION_CURATOR))) return true
  return ownsContent(req, String(doc.id))
}

const authorOrSuperAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  return { author: { equals: req.user.id } }
}

async function contentIdsOfObjects(req: PayloadRequest, objectIds: string[]) {
  if (!objectIds.length) return []
  const { docs } = await req.payload.find({
    collection: 'objects',
    where: { id: { in: objectIds } },
    select: { contents: true },
    depth: 0,
    pagination: false,
    req,
  })
  return docs.flatMap((object) => (object.contents ?? []).map(asId)).filter(Boolean) as string[]
}

/**
 * Own contents, plus moderation along the hierarchy director → curator →
 * everyone else: in each museum where the caller is curator or director, they
 * may delete contents of that museum whose author does not hold the same or a
 * higher rank there.
 */
const deleteContents: Access = async ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const own: Where = { author: { equals: req.user.id } }
  const moderated: Where[] = []
  for (const [museumId, fn] of await getMuseumRoles(req)) {
    if (!hasRank(fn, MUSEUM_FUNCTION_CURATOR)) continue
    const contentIds = await contentIdsOfObjects(req, await objectIdsInMuseums(req, [museumId]))
    if (!contentIds.length) continue
    const protectedAuthors = await staffIdsWithRank(req, museumId, fn)
    moderated.push({
      and: [{ id: { in: contentIds } }, { author: { not_in: protectedAuthors } }],
    })
  }
  return moderated.length ? { or: [own, ...moderated] } : own
}

const assignAuthor: CollectionBeforeChangeHook<Content> = ({ data, req, operation }) => {
  // Clients cannot pick an author: it is always the caller. Trusted Local API
  // calls without a user (seed, jobs) and super admins keep what they pass.
  if (operation === 'create' && req.user && !isSuperAdmin(req)) data.author = req.user.id
  return data
}

/**
 * Only verified creators, curators and directors of a museum the content
 * belongs to may set or change a price. Keeping an existing price is always
 * allowed so a later badge revocation doesn't block unrelated edits.
 */
const guardPaidContent: CollectionBeforeChangeHook<Content> = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!req.user || isSuperAdmin(req)) return data
  if (!data.price || data.price === originalDoc?.price) return data
  const museums = originalDoc
    ? await museumIdsForContent(req, String(originalDoc.id))
    : await museumIdsForObjects(req, data.attachToObject ? [data.attachToObject] : [])
  const roles = await getMuseumRoles(req)
  if (!museums.some((id) => hasRank(roles.get(id), MUSEUM_FUNCTION_VERIFIED))) {
    throw new APIError(
      'Only verified creators, curators and directors of the museum can sell contents.',
      403,
    )
  }
  return data
}

/**
 * Rights of the content (`src/lib/content-rights.ts`):
 * - the licence follows the price: a paid content is always "all rights
 *   reserved";
 * - only curators and directors of a museum may make it the rights holder;
 * - a new content needs the author's declaration that the text is theirs.
 *   The client only says it was given; the server stamps the time.
 * Trusted Local API calls without a user (seed, jobs) and super admins skip
 * the last two checks, as they do for the author.
 */
const guardRights: CollectionBeforeChangeHook<Content> = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const price = data.price !== undefined ? data.price : originalDoc?.price
  const license = isLicense(data.license) ? data.license : originalDoc?.license
  data.license = effectiveLicense(price, license)
  if (!req.user || isSuperAdmin(req)) return data

  const museum = data.rightsMuseum ? asId(data.rightsMuseum) : null
  if (museum && museum !== asId(originalDoc?.rightsMuseum)) {
    const roles = await getMuseumRoles(req)
    if (!hasRank(roles.get(museum), MUSEUM_FUNCTION_CURATOR)) {
      throw new APIError(
        'Only curators and directors of a museum can make it the rights holder.',
        403,
      )
    }
  }
  if (operation === 'create') {
    if (!data.rightsDeclaredAt) {
      throw new APIError('Declare that you are the author of the text or hold its rights.', 400)
    }
    data.rightsDeclaredAt = new Date().toISOString()
  }
  return data
}

const storeDuration: CollectionBeforeChangeHook<Content> = ({ data }) => {
  // Stored (not only computed on read) so cards keep it when a paid body is hidden.
  if (data.body) data.durationSeconds = estimatedSeconds(data.body)
  return data
}

/**
 * `objects.contents` is the authored relation (tour navigation and object
 * pages read it), so a content created "about" an object is linked there.
 * Done with Local API privileges: writing about an object must not require
 * permission to edit the object itself.
 */
const attachToObject: CollectionAfterChangeHook<Content> = async ({
  doc,
  data,
  req,
  operation,
}) => {
  const objectId = data?.attachToObject
  if (operation !== 'create' || typeof objectId !== 'string' || !objectId) return doc
  const object = await req.payload.findByID({
    collection: 'objects',
    id: objectId,
    depth: 0,
    select: { contents: true },
    req,
  })
  await req.payload.update({
    collection: 'objects',
    id: objectId,
    data: { contents: [...(object.contents ?? []).map(asId), String(doc.id)] as string[] },
    depth: 0,
    // Linking a content must not regenerate the object's 3D model.
    context: { skipMintModelGeneration: true },
    req,
  })
  return doc
}

/**
 * A tour's search row carries its list price, the sum of its contents' prices
 * (docs/search.md). The search plugin re-indexes this content on save; when the
 * price changed, the rows of the tours that include it are refreshed too.
 */
const refreshTourPrices: CollectionAfterChangeHook<Content> = async ({ doc, previousDoc, req }) => {
  if ((doc.price ?? 0) === (previousDoc?.price ?? 0)) return doc
  try {
    const tours = await req.payload.find({
      collection: 'tours',
      where: { contents: { contains: doc.id } },
      select: {},
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    await refreshSearchDocs({
      payload: req.payload,
      collection: 'tours',
      ids: tours.docs.map((tour) => String(tour.id)),
      req,
    })
  } catch (error) {
    // Search is derived data: never fail the content save over it.
    req.payload.logger.error({ err: error, msg: `Could not refresh tour prices for ${doc.id}` })
  }
  return doc
}

/**
 * Read-aloud audio of the base text (`src/lib/content-audio.ts`): when the
 * English source (the language contents are written in) is created or its
 * title or text changes, a `generateContentAudio` job refreshes its MP3.
 * Other languages are generated on demand by `/api/content-audio/[id]`, when
 * someone first listens to a translation. Without a speech API key nothing is
 * queued, so seeds and local setups don't pile up failing jobs.
 */
const queueContentAudio: CollectionAfterChangeHook<Content> = async ({
  doc,
  previousDoc,
  req,
  operation,
  context,
}) => {
  if (context.skipContentAudio || !process.env.FISH_API_KEY) return doc
  if ((req.locale ?? 'en') !== 'en') return doc
  const changed =
    operation === 'create' ||
    doc.title !== previousDoc?.title ||
    JSON.stringify(doc.body) !== JSON.stringify(previousDoc?.body)
  if (!changed || !doc.body) return doc
  try {
    await req.payload.jobs.queue({
      task: 'generateContentAudio',
      input: { contentId: String(doc.id), locale: 'en' },
      queue: AUDIO_QUEUE,
      req,
    })
  } catch (error) {
    // Audio is derived data: never fail the content save over it.
    req.payload.logger.error({ err: error, msg: `Could not queue the audio of ${doc.id}` })
  }
  return doc
}

/**
 * Private contents (`src/lib/visibility.ts`) can't be sold, and a content
 * someone bought or put in their own tour can't be made private afterwards:
 * it would disappear from under them.
 */
const guardVisibility: CollectionBeforeChangeHook<Content> = async ({ data, req, originalDoc }) => {
  const visibility = data.visibility ?? originalDoc?.visibility
  const price = data.price !== undefined ? data.price : originalDoc?.price
  if (visibility !== 'private') return data
  if (price && price > 0) throw new APIError('A private content cannot be sold.', 400)
  if (!originalDoc || originalDoc.visibility === 'private') return data
  const id = String(originalDoc.id)
  const author = asId(originalDoc.author)
  const [bought, adopted] = await Promise.all([
    req.payload.count({
      collection: 'purchases',
      where: { unlockedContents: { contains: id } },
      overrideAccess: true,
      req,
    }),
    req.payload.count({
      collection: 'tours',
      where: { and: [{ contents: { contains: id } }, { author: { not_equals: author } }] },
      overrideAccess: true,
      req,
    }),
  ])
  if (bought.totalDocs || adopted.totalDocs) {
    throw new APIError(
      'This content was bought or is used in other authors’ tours: it cannot become private.',
      400,
    )
  }
  return data
}

export const Contents: CollectionConfig = {
  slug: 'contents',
  access: {
    // Private contents only for their author and group guests of their tour.
    read: readContents,
    create: authenticated,
    update: authorOrSuperAdmin,
    delete: deleteContents,
  },
  hooks: {
    beforeValidate: [richTextFromHtml(['body'])],
    beforeChange: [assignAuthor, guardPaidContent, guardRights, guardVisibility, storeDuration],
    afterChange: [attachToObject, refreshTourPrices, queueContentAudio, hideFromSearch('contents')],
    // Quiz questions about a deleted content are unlinked, or deleted when it was their last one.
    afterDelete: [detachDeletedContentFromQuestions],
  },
  fields: [
    DifficultyField,
    {
      // Private: only the author (and the guests of a group visit of a tour
      // that includes it) can read it; never sold, never in search.
      name: 'visibility',
      type: 'select',
      defaultValue: 'public',
      index: true,
      options: [...VISIBILITY_OPTIONS],
    },
    {
      // Who the text is written for. Personalised tours for families pick
      // `children` contents first; any content can also be read in a
      // children's version from its modal (`contentVariants`).
      name: 'audience',
      type: 'select',
      defaultValue: 'everyone',
      options: [
        { label: 'Everyone', value: 'everyone' },
        { label: 'Children', value: 'children' },
      ],
    },
    editorial({ name: 'title', type: 'text', required: true, unique: true }),
    {
      ...editorial({ name: 'body', type: 'richText', required: true }),
      access: { read: canReadPaidBody },
    },
    richTextHtmlInput('body'),
    {
      // Exact length in seconds (an item can last 15 seconds or 4 minutes),
      // estimated from the body at a read-aloud pace (`src/lib/duration.ts`).
      name: 'durationSeconds',
      type: 'number',
      required: false,
      min: 0,
      hooks: {
        // Contents saved before this field computed it on read when the body
        // is readable; older ones stored minutes in `readingTimeMins`.
        afterRead: [
          ({ value, siblingData }) =>
            value ||
            estimatedSeconds(siblingData.body) ||
            ((siblingData as { readingTimeMins?: number }).readingTimeMins ?? 0) * 60 ||
            undefined,
        ] as FieldHook<Content, number | undefined, Content>[],
      },
    },
    {
      // Price in euro cents; empty or 0 means free. The single price source:
      // Stripe checkout charges it (`src/lib/checkout-quote.ts`), and display
      // currency/format is a frontend concern (`src/lib/price.ts`).
      name: 'price',
      type: 'number',
      min: 0,
      required: false,
      admin: { description: 'Euro cents. Empty or 0 = free.', step: 1 },
    },
    {
      // Licence others may use the text under; a price forces "all rights
      // reserved" (`guardRights`). The credit line shows it next to the holder.
      name: 'license',
      type: 'select',
      // Not `required`: `guardRights` always sets it, so creates (seeds,
      // jobs) needn't pass it and older contents read without one.
      required: false,
      defaultValue: DEFAULT_LICENSE,
      options: LICENSES.map((value) => ({ label: LICENSE_NAME[value], value })),
    },
    {
      // Rights holder when it isn't the author: a museum where the author is
      // curator or director (`guardRights`). Empty = the author holds them.
      name: 'rightsMuseum',
      type: 'relationship',
      relationTo: 'museums',
      required: false,
    },
    {
      // When the author declared that the text is theirs (or that they hold
      // its rights); stamped by the server on create, never edited after.
      name: 'rightsDeclaredAt',
      type: 'date',
      required: false,
      access: { update: ({ req }) => isSuperAdmin(req) },
      admin: { readOnly: true },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'museumCategories',
      hasMany: true,
      required: false,
      index: true,
      admin: { description: 'Shared museum taxonomy, used by search filters.' },
    },
    {
      // Bibliographic references shown at the end of the content page.
      name: 'sources',
      type: 'array',
      required: false,
      fields: [
        editorial({ name: 'label', type: 'text', required: true }),
        { name: 'url', type: 'text', required: false },
      ],
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
      // Subjects (an artist, a style, an event) this content is about, read
      // back from `subjects.contents` like `objects` above.
      name: 'subjects',
      type: 'join',
      collection: 'subjects',
      on: 'contents',
    },
    {
      // Additions and other versions of this content (`contentVariants`),
      // listed here so staff can review them from the content itself.
      name: 'variants',
      type: 'join',
      collection: 'contentVariants',
      on: 'content',
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
      // Create-only input: the object this content is written about.
      name: 'attachToObject',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
    },
  ],
}

export const ContentImages: CollectionConfig = {
  slug: 'contentImages',
  // Card and cover widths derived on upload (src/fields/imageUpload.ts).
  upload: imageUpload,
  access: {
    read: anyone,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [editorial({ name: 'alt', type: 'text', required: false })],
}
