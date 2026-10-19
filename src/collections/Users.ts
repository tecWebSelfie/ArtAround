import {
  anyone,
  asId,
  canManage,
  forgetMuseumRoles,
  isSuperAdmin,
  rankIn,
  superAdminOnly,
} from '@/access/museumRoles'
import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
  MUSEUM_FUNCTION_VERIFIED,
  type MuseumRole,
} from '@/fields/MuseumFunction'
import { User as UserType } from '@/payload-types'
import type {
  Access,
  CollectionAfterChangeHook,
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
  PayloadRequest,
} from 'payload'
import { GroupField, TypeWithID } from 'payload'

export const USERS_COLLECTION_SLUG = 'users'
export const TOURS_COLLECTION_SLUG = 'tours'

interface WithNameFields extends TypeWithID {
  firstName: string
  lastName: string
}

type NameFieldHook<R> = FieldHook<WithNameFields, R, WithNameFields>

const nameFieldsGroup: GroupField = {
  name: 'name',
  type: 'group',
  required: false,
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'fullName',
      type: 'text',
      virtual: true,
      required: true,
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            [siblingData.firstName, siblingData.lastName].filter(Boolean).join(' '),
        ] satisfies NameFieldHook<string>[],
      },
    },
  ],
}

// Profiles are public (social-like browsing of creators), but every user only
// edits their own document. Super admins manage everyone from the admin panel.
const selfOrSuperAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  return { id: { equals: req.user.id } }
}

// The email is private: only the owner (and super admins) see it. Done in an
// afterRead hook rather than by redeclaring the auth-injected `email` field,
// so Payload keeps its own unique/index/validation setup for it.
const hidePrivateFields: CollectionAfterReadHook<UserType> = ({ doc, req }) => {
  const self = Boolean(req.user) && String(req.user!.id) === String(doc.id)
  if (!self && !isSuperAdmin(req)) delete doc.email
  return doc
}

/**
 * The RBAC plugin adds `isSuperAdmin`, `roles` and `parent` to this collection
 * without field-level access, so self-update through REST could escalate.
 * Strip them unless a super admin (or a trusted Local API call without user,
 * e.g. the seed) is writing.
 */
const protectPrivilegedFields: CollectionBeforeChangeHook = ({ data, req, originalDoc }) => {
  if (!req.user || isSuperAdmin(req)) return data
  for (const field of ['isSuperAdmin', 'roles', 'parent'] as const) {
    if (originalDoc) data[field] = originalDoc[field]
    else delete data[field]
  }
  return data
}

export const Users: CollectionConfig = {
  slug: USERS_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'username',
  },
  auth: {
    loginWithUsername: true,
  },
  access: {
    read: anyone,
    // Public sign-up; privileged fields are guarded by `protectPrivilegedFields`.
    create: anyone,
    update: selfOrSuperAdmin,
    delete: selfOrSuperAdmin,
  },
  hooks: {
    beforeChange: [protectPrivilegedFields],
    afterRead: [hidePrivateFields],
  },
  fields: [
    // Email added by default (auth); hidden from other visitors by `hidePrivateFields`.
    nameFieldsGroup,
    {
      // Reverse of `contents.author`: authorship lives on the content, so
      // creating a content never requires editing the user.
      name: 'authoredContents',
      type: 'join',
      collection: 'contents',
      on: 'author',
    },
    {
      name: 'authoredTours',
      type: 'join',
      collection: 'tours',
      on: 'author',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'usersPropics',
      required: false,
    },
    {
      name: 'bio',
      type: 'textarea',
      defaultValue: 'This user has not added a bio yet.',
      localized: true,
    },
    {
      // Every per-museum role (director, curator, verified) of this user.
      name: 'memberships',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
    },
    {
      name: 'curatorOf',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
      where: { role: { equals: MUSEUM_FUNCTION_CURATOR } },
    },
    {
      name: 'directorOf',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
      where: { role: { equals: MUSEUM_FUNCTION_DIRECTOR } },
    },
    {
      // The verified badge is per museum, granted by its curators/director.
      name: 'verifiedAt',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
      where: { role: { equals: MUSEUM_FUNCTION_VERIFIED } },
    },
    {
      name: 'highestStatus',
      type: 'select',
      virtual: true,
      options: [
        { label: 'Curator', value: MUSEUM_FUNCTION_CURATOR },
        { label: 'Director', value: MUSEUM_FUNCTION_DIRECTOR },
        { label: 'Verified', value: MUSEUM_FUNCTION_VERIFIED },
        { label: 'None', value: MUSEUM_FUNCTION_NONE },
      ],
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            // Determine the highest status based on the user's memberships.
            if (siblingData.directorOf?.docs?.length) return MUSEUM_FUNCTION_DIRECTOR
            if (siblingData.curatorOf?.docs?.length) return MUSEUM_FUNCTION_CURATOR
            if (siblingData.verifiedAt?.docs?.length) return MUSEUM_FUNCTION_VERIFIED
            return MUSEUM_FUNCTION_NONE
          },
        ] as FieldHook<UserType, UserType['highestStatus'], UserType>[],
      },
    },
  ],
}

type MembershipDoc = { user: unknown; museum: unknown; role?: MuseumRole | null }

const currentMembership = (req: PayloadRequest, id: string | number | undefined) =>
  id
    ? (req.payload
        .findByID({ collection: 'user-museum-memberships', id, depth: 0, req })
        .catch(() => null) as Promise<MembershipDoc | null>)
    : Promise.resolve(null)

/**
 * Who may grant / change / revoke a membership, as plain collection access
 * so the frontend uses the SDK's typed CRUD (`payloadSdk.create/update/delete`).
 * Rule (`canManage`): only roles strictly below the actor's rank in that
 * museum, never the actor's own row, never the director seat (super admin).
 */
const createMembership: Access = async ({ req, data }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const museum = asId(data?.museum)
  if (!museum || asId(data?.user) === String(req.user.id)) return false
  return canManage(await rankIn(req, museum), data?.role ?? null)
}

const updateMembership: Access = async ({ req, id, data }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const current = await currentMembership(req, id)
  if (!current || asId(current.user) === String(req.user.id)) return false
  // Rows are re-assigned, never moved to another user or museum.
  if (data?.user && asId(data.user) !== asId(current.user)) return false
  if (data?.museum && asId(data.museum) !== asId(current.museum)) return false
  const actor = await rankIn(req, asId(current.museum))
  return (
    canManage(actor, current.role ?? null) && canManage(actor, data?.role ?? current.role ?? null)
  )
}

const deleteMembership: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (isSuperAdmin(req)) return true
  const current = await currentMembership(req, id)
  if (!current || asId(current.user) === String(req.user.id)) return false
  return canManage(await rankIn(req, asId(current.museum)), current.role ?? null)
}

/** One director per museum: appointing one (super admin only) replaces the previous. */
const singleDirector: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (doc.role !== MUSEUM_FUNCTION_DIRECTOR || context.skipSingleDirector) return doc
  await req.payload.delete({
    collection: 'user-museum-memberships',
    where: {
      and: [
        { museum: { equals: asId(doc.museum) } },
        { role: { equals: MUSEUM_FUNCTION_DIRECTOR } },
        { id: { not_equals: doc.id } },
      ],
    },
    context: { skipSingleDirector: true },
    req,
  })
  return doc
}

/**
 * One row per (user, museum): the user's single role in that museum.
 * Public to read (badges are shown on profiles). Independent of the RBAC
 * plugin's global roles, which only drive the admin panel.
 */
export const UserMuseumMembership: CollectionConfig = {
  slug: 'user-museum-memberships',
  indexes: [{ unique: true, fields: ['user', 'museum'] }],
  access: {
    read: anyone,
    create: createMembership,
    update: updateMembership,
    delete: deleteMembership,
  },
  hooks: {
    afterChange: [singleDirector, ({ doc, req }) => (forgetMuseumRoles(req), doc)],
    afterDelete: [({ doc, req }) => (forgetMuseumRoles(req), doc)],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      index: true,
    },
    {
      // The user's role in this museum: source of truth for every
      // per-museum rule (`src/access/museumRoles.ts`).
      name: 'role',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Director', value: MUSEUM_FUNCTION_DIRECTOR },
        { label: 'Curator', value: MUSEUM_FUNCTION_CURATOR },
        { label: 'Verified creator', value: MUSEUM_FUNCTION_VERIFIED },
      ],
    },
    {
      name: 'museum',
      type: 'relationship',
      relationTo: 'museums',
      hasMany: false,
      required: true,
      index: true,
    },
  ],
}

export const UsersPropics: CollectionConfig = {
  slug: 'usersPropics',
  upload: true,
  access: {
    read: anyone,
    create: ({ req }) => Boolean(req.user),
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
