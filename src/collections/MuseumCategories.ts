import type { CollectionConfig } from 'payload'

import { editorial } from '@/fields/editorial'
import { getPermissionAccess } from '@zealamic/payload-plugin-rbac'

/**
 * Museum categories: the browsable taxonomy of the museum catalog (e.g.
 * "Arte", "Scienza", "Storia" or finer facets below them).
 *
 * Kept as its own collection instead of a free-text field on `museums` so the
 * catalog can filter/group by a stable, translatable label and so editors can
 * manage the taxonomy once. `parent` allows light nesting (Arte → Arte
 * contemporanea) without committing to a full tree plugin.
 */
export const MuseumCategories: CollectionConfig = {
  slug: 'museumCategories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent', 'featured'],
    description: 'Taxonomy used to group and filter museums.',
  },
  access: {
    // Categories are shown on the public catalog, so reads stay open.
    read: () => true,
    // Only roles that may manage museums may manage its taxonomy. Reusing the
    // "Museum" feature keeps the RBAC permission matrix unchanged.
    create: getPermissionAccess({ featureCode: 'Museum', actionCode: 'Create' }),
    update: getPermissionAccess({
      featureCode: 'Museum',
      actionCode: 'Update',
      collectionSlug: 'museumCategories',
      mode: 'modify',
    }),
    delete: getPermissionAccess({
      featureCode: 'Museum',
      actionCode: 'Delete',
      collectionSlug: 'museumCategories',
      mode: 'modify',
    }),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Derive a URL/filter-safe slug from the (current-locale) name when the
        // editor leaves it empty. An explicit slug always wins so renaming a
        // translated category never breaks existing links.
        if (!data || (data.slug && String(data.slug).trim() !== '')) return data
        const name = typeof data.name === 'string' ? data.name : ''
        if (!name) return data
        return {
          ...data,
          slug: name
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        }
      },
    ],
  },
  fields: [
    // Not `unique`: localized values live as an object per document, so a
    // unique index would compare locale maps rather than individual labels.
    // `slug` below is the stable natural key.
    editorial({ name: 'name', type: 'text', required: true, maxLength: 60 }),
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Stable machine name used in URLs and filters. Auto-generated from the name.',
      },
    },
    editorial({ name: 'description', type: 'textarea', required: false, maxLength: 240 }),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'museumCategories',
      hasMany: false,
      required: false,
      admin: {
        description: 'Optional broader category. Leave empty for a top-level category.',
      },
    },
    {
      name: 'icon',
      type: 'text',
      required: false,
      admin: {
        description: 'Lucide icon name shown on category chips (e.g. "palette", "landmark").',
      },
    },
    {
      name: 'color',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional accent color for the category chip (hex, e.g. "#7C3AED").',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      required: false,
      defaultValue: false,
      admin: { description: 'Surface this category in the home/catalog shortcuts.' },
    },
    {
      // Reverse view: every museum tagged with this category.
      name: 'museums',
      type: 'join',
      collection: 'museums',
      on: 'categories',
      hasMany: true,
    },
  ],
}
