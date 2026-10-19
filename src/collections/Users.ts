import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
} from '@/fields/MuseumFunction'
import { User as UserType } from '@/payload-types'
import { getPermissionAccess } from '@zealamic/payload-plugin-rbac'
import type { Access, CollectionConfig, FieldHook, Where } from 'payload'
import { GroupField, TypeWithID } from 'payload'

import { sanitizePublicSignup } from '@/hooks/sanitizePublicSignup'

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

/**
 * RBAC's own `users.read` rule (same feature code/options the plugin uses), so
 * self-read support below does not weaken staff/super-admin visibility.
 */
const rbacUsersRead = getPermissionAccess({
  actionCode: 'read',
  featureCode: USERS_COLLECTION_SLUG,
  options: { createdByField: 'id', usersCollectionSlug: USERS_COLLECTION_SLUG },
}) as (args: { req: Parameters<Access>[0]['req'] }) => Promise<boolean | Where>

/**
 * A signed-in user must always be able to read their own document: Payload's
 * `GET /api/users/me` performs a normal read, and freshly registered accounts
 * have no RBAC role yet. Listing other users still follows the RBAC scope.
 */
const readUsers: Access = async (args) => {
  const rbac = await rbacUsersRead({ req: args.req })

  if (!args.req.user) {
    return rbac
  }

  const self: Where = { id: { equals: args.req.user.id } }

  if (rbac === true) return true
  if (rbac === false) return self

  return { or: [self, rbac] }
}

export const Users: CollectionConfig = {
  slug: USERS_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'username',
  },
  auth: {
    // Visitors can authenticate with either their email or their username.
    // `allowEmailLogin` is required: with a plain `loginWithUsername: true`
    // Payload disables email-based login and only accepts `username`.
    loginWithUsername: {
      allowEmailLogin: true,
    },
  },
  access: {
    // Only RBAC super admins may open the Payload admin panel. This is
    // evaluated after authentication, so regular frontend accounts still
    // exist normally but are redirected to the admin login/unauthorized page.
    admin: ({ req: { user } }) => Boolean(user && 'isSuperAdmin' in user && user.isSuperAdmin),
    // RBAC denies anonymous REST on `users`; opt `create` back in so the
    // frontend sign-up form can register a visitor. Everything a visitor is
    // not allowed to choose is stripped by `sanitizePublicSignup`, and the
    // remaining operations (update/delete) keep the RBAC defaults.
    create: () => true,
    read: readUsers,
  },
  hooks: {
    beforeValidate: [sanitizePublicSignup],
  },
  fields: [
    // Email added by default
    // Add more fields as needed
    nameFieldsGroup,
    {
      name: 'authoredContents',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      required: false,
    },
    {
      name: 'authoredTours',
      type: 'relationship',
      relationTo: 'tours',
      hasMany: true,
      required: false,
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
      name: 'curatorOf',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
      where: { 'role.museumFunction': { equals: MUSEUM_FUNCTION_CURATOR } },
    },
    {
      name: 'directorOf',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'user',
      where: { 'role.museumFunction': { equals: MUSEUM_FUNCTION_DIRECTOR } },
    },
    {
      name: 'verifieds',
      type: 'relationship',
      relationTo: 'museums',
      hasMany: true,
      required: false,
    },
    {
      name: 'highestStatus',
      type: 'select',
      virtual: true,
      options: [
        { label: 'Curator', value: MUSEUM_FUNCTION_CURATOR },
        { label: 'Director', value: MUSEUM_FUNCTION_DIRECTOR },
        { label: 'Verified', value: 'verified' },
        { label: 'None', value: MUSEUM_FUNCTION_NONE },
      ],
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            // Determine the highest status based on the user's memberships and verified status.
            if (siblingData.directorOf?.docs?.length) return MUSEUM_FUNCTION_DIRECTOR
            if (siblingData.curatorOf?.docs?.length) return MUSEUM_FUNCTION_CURATOR
            if (siblingData.verifieds?.length) return 'verified'
            return MUSEUM_FUNCTION_NONE
          },
        ] as FieldHook<UserType, UserType['highestStatus'], UserType>[],
      },
    },
  ],
}

export const UserMuseumMembership: CollectionConfig = {
  slug: 'user-museum-memberships',
  indexes: [{ unique: true, fields: ['user', 'museum'] }],
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
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      hasMany: false,
      required: true,
      // Only roles carrying a museum function can be assigned.
      // Roles with `none` would create meaningless memberships.
      filterOptions: {
        museumFunction: { not_equals: MUSEUM_FUNCTION_NONE },
      },
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
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
