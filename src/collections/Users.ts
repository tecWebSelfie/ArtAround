import type { CollectionConfig, TextField } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
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

export function userRole(role: 'admin' | 'curator' | 'director' | 'guest' | 'user'): TextField {
  return {
    name: 'role',
    type: 'text',
    required: true,
    defaultValue: role,
  }
}

export const Tour: CollectionConfig = {
  slug: 'tours',
  fields: [],
}
