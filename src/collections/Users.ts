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
      name: 'avatar',
      type: 'upload',
      relationTo: 'usersPropics',
      required: false,
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
