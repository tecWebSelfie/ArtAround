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
import { richTextFromHtml, richTextHtmlInput } from '@/fields/richTextHtml'
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
import { readingTime } from 'reading-time-estimator'

/**
 * Contents are user-generated: any logged-in user writes them, the author is
 * the only editor, and museum staff moderate (delete) them following the
 * museum hierarchy. A positive `price` makes the content paid: its `body` is
 * then readable only by people entitled to it (`canReadPaidBody`), enforced at
 * field level so REST, the localized endpoint and server pages all agree.
 */

const readingMinutes = (body: Content['body'] | undefined) =>
  body ? readingTime(convertLexicalToPlaintext({ data: body })).minutes : undefined

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

const storeReadingTime: CollectionBeforeChangeHook<Content> = ({ data }) => {
  // Stored (not only computed on read) so cards keep it when a paid body is hidden.
  if (data.body) data.readingTimeMins = readingMinutes(data.body)
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

export const Contents: CollectionConfig = {
  slug: 'contents',
  access: {
    read: anyone,
    create: authenticated,
    update: authorOrSuperAdmin,
    delete: deleteContents,
  },
  hooks: {
    beforeValidate: [richTextFromHtml(['body'])],
    beforeChange: [assignAuthor, guardPaidContent, storeReadingTime],
    afterChange: [attachToObject],
  },
  fields: [
    DifficultyField,
    editorial({ name: 'title', type: 'text', required: true, unique: true }),
    {
      ...editorial({ name: 'body', type: 'richText', required: true }),
      access: { read: canReadPaidBody },
    },
    richTextHtmlInput('body'),
    {
      name: 'readingTimeMins',
      type: 'number',
      required: false,
      hooks: {
        // Older documents predate the stored value: compute it when the body is readable.
        afterRead: [
          ({ value, siblingData }) => value ?? readingMinutes(siblingData.body),
        ] as FieldHook<Content, number | undefined, Content>[],
      },
    },
    {
      // Price in euro cents; empty or 0 means free. Display currency/format is
      // a frontend concern (`src/lib/price.ts`).
      name: 'price',
      type: 'number',
      min: 0,
      required: false,
      admin: { description: 'Euro cents. Empty or 0 = free.', step: 1 },
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
  upload: true,
  access: {
    read: anyone,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [editorial({ name: 'alt', type: 'text', required: false })],
}
