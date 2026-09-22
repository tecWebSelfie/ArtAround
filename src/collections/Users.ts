import type { CollectionConfig } from 'payload'

export const USERS_COLLECTION_SLUG = 'users'
export const TOURS_COLLECTION_SLUG = 'tours'

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
  ],
}

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  fields: [],
}
