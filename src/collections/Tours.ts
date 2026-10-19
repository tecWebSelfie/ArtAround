import {
  anyone,
  authenticated,
  isSuperAdmin,
  museumsWithRank,
  superAdminOnly,
} from '@/access/museumRoles'
import { MUSEUM_FUNCTION_DIRECTOR } from '@/fields/MuseumFunction'
import type { Tour as TourType } from '@/payload-types'
import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'

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

export const Tour: CollectionConfig = {
  slug: TOURS_COLLECTION_SLUG,
  access: {
    read: anyone,
    create: authenticated,
    update: authorOrSuperAdmin,
    delete: authorOrMuseumDirector,
  },
  hooks: {
    beforeChange: [assignAuthor],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
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
  ],
}

export const ToursThumbnails: CollectionConfig = {
  slug: 'toursThumbnails',
  upload: true,
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
