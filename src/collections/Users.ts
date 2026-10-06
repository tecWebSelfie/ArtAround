import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
} from '@/fields/MuseumFunction'
import { User as UserType } from '@/payload-types'
import type { CollectionConfig, FieldHook } from 'payload'
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
      required: true,
      virtual: true,
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            [siblingData?.firstName, siblingData?.lastName].filter(Boolean).join(' '),
        ] satisfies NameFieldHook<string>[],
      },
    },
  ],
}

export const Users: CollectionConfig = {
  slug: USERS_COLLECTION_SLUG,
  admin: {
    useAsTitle: 'username',
  },
  auth: {
    loginWithUsername: true,
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
