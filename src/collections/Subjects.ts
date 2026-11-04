import { isSuperAdmin, museumsWithRank, superAdminOnly } from '@/access/museumRoles'
import { editorial } from '@/fields/editorial'
import { MUSEUM_FUNCTION_CURATOR } from '@/fields/MuseumFunction'
import { uniqueWikidataId, wikidataIdField } from '@/fields/wikidataId'
import type { Access, CollectionConfig } from 'payload'

/**
 * What a work is related to without being a thing on the map: the people who
 * made it, the movement or style it belongs to, the events it took part in
 * (requirement 5 of `docs/plan/requisiti-18-33.md`). Kept apart from
 * `objects`, which are physical pieces placed on a museum map, so map,
 * navigation and QR code never meet a painter.
 *
 * Works link here through `objects.creators`, `movements` and `events`;
 * contents can be about a subject too (`subjects.contents`, read back on
 * contents as the `subjects` join), e.g. an item about Parmigianino.
 * Subjects with a Wikidata id are usually created by the
 * `importWikidataSubjects` task when a work gets its own id.
 */

const anyMuseumStaff: Access = async ({ req }) =>
  isSuperAdmin(req) || (await museumsWithRank(req, MUSEUM_FUNCTION_CURATOR)).length > 0

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'kind', 'wikidataId'] },
  access: {
    read: () => true,
    create: anyMuseumStaff,
    update: anyMuseumStaff,
    delete: superAdminOnly,
  },
  hooks: { beforeValidate: [uniqueWikidataId('subjects')] },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Person', value: 'person' },
        { label: 'Movement or style', value: 'movement' },
        { label: 'Event', value: 'event' },
      ],
    },
    editorial({ name: 'name', type: 'text', required: true }),
    editorial({ name: 'description', type: 'textarea', required: false, maxLength: 500 }),
    // Universal identifier; the current id when Wikidata merged the item.
    wikidataIdField('Wikidata item, e.g. Q5597 for Raphael.'),
    {
      // Contents about this subject (an item about an artist, a style…).
      name: 'contents',
      type: 'relationship',
      relationTo: 'contents',
      hasMany: true,
      required: false,
    },
    {
      // Metadata only: names and descriptions came from Wikidata.
      name: 'importedFromWikidata',
      type: 'checkbox',
      defaultValue: false,
      admin: { readOnly: true },
    },
  ],
}
