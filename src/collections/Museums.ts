import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Field,
  type FieldAccess,
  type JSONField,
} from 'payload'
import { fieldAffectsData } from 'payload/shared'
import { OpeningHours } from '../fields/OpeningHours'
import { TicketInfo } from '../fields/TicketInfo'

import {
  anyone,
  authenticated,
  forgetMuseumRoles,
  hasRank,
  isSuperAdmin,
  museumScoped,
  rankIn,
  superAdminOnly,
} from '@/access/museumRoles'
import { editorial } from '@/fields/editorial'
import { MUSEUM_FUNCTION_CURATOR, MUSEUM_FUNCTION_DIRECTOR } from '@/fields/MuseumFunction'
import { richTextFromHtml, richTextHtmlInput } from '@/fields/richTextHtml'
import { SocialLinks } from '@/fields/SocialLinks'
import { curatorForbiddenChanges } from '@/lib/pascal/map-permissions'
import navMeshSchema from '@/lib/schemas/navmesh.schema.json'
import { museumObjectId } from '@/lib/tour-navigation'
import type { Museum } from '@/payload-types'
import { phoneNumberField } from 'payload-phone-number-plugin'

/**
 * Museums are run by one director and their curators (per-museum roles in
 * `user-museum-memberships`):
 * - any logged-in user may create a museum and becomes its director;
 * - the director edits everything about it;
 * - curators edit only the map, and inside it only the placement of catalog
 *   objects: the map fields are open to curators (every other field is
 *   director-only) and `guardCuratorMapEdits` rejects any other scene change
 *   (services, entrances/exits, structure are the director's).
 */

const directorOfThisMuseum: FieldAccess<Museum> = async ({ req, id, doc }) =>
  isSuperAdmin(req) || hasRank(await rankIn(req, String(doc?.id ?? id)), MUSEUM_FUNCTION_DIRECTOR)

/** Lock a metadata field to the museum's director (create is governed by collection access). */
const directorOnly = <T extends Field>(field: T): T =>
  fieldAffectsData(field)
    ? ({ ...field, access: { ...field.access, update: directorOfThisMuseum } } as T)
    : field

// Mongo ObjectIds only: placeholder ids from fixtures must not reach a relationship query.
const OBJECT_ID = /^[a-f\d]{24}$/i

/**
 * `objects` is a derived index of the Pascal map: an object is exhibited by a
 * museum when the saved scene places its catalog asset. Keeping it as a real
 * relationship makes "museums of an object" queryable for access control and
 * the `objects.museums` join, while the map stays the single source of truth.
 */
const syncMuseumObjects: CollectionBeforeChangeHook<Museum> = async ({ data, req }) => {
  if (data.map === undefined) {
    // Never accept a client-written index: only a map save recomputes it.
    delete data.objects
    return data
  }
  const nodes = (data.map as { nodes?: Record<string, unknown> } | null)?.nodes ?? {}
  const placed = [
    ...new Set(
      Object.values(nodes)
        .map(museumObjectId)
        .filter((id): id is string => !!id),
    ),
  ].filter((id) => OBJECT_ID.test(id))
  const { docs } = placed.length
    ? await req.payload.find({
        collection: 'objects',
        where: { id: { in: placed } },
        select: {},
        depth: 0,
        pagination: false,
        req,
      })
    : { docs: [] }
  data.objects = docs.map((object) => String(object.id))
  return data
}

/**
 * Curators may save the map only to place, move or remove catalog objects.
 * Runs before `syncMuseumObjects` so a rejected save never reindexes.
 */
const guardCuratorMapEdits: CollectionBeforeChangeHook<Museum> = async ({
  data,
  req,
  originalDoc,
}) => {
  if (data.map === undefined || !originalDoc || !req.user || isSuperAdmin(req)) return data
  if (hasRank(await rankIn(req, String(originalDoc.id)), MUSEUM_FUNCTION_DIRECTOR)) return data
  const forbidden = curatorForbiddenChanges(originalDoc.map, data.map)
  if (forbidden.length) {
    throw new APIError(
      'Curators can only place, move or remove objects on the map. Services, entrances, exits and the building are managed by the director.',
      403,
      { nodes: forbidden },
    )
  }
  return data
}

/** The creator of a museum becomes its (single) director. */
const appointCreatorAsDirector: CollectionAfterChangeHook<Museum> = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create' || !req.user) return doc
  // Trusted Local API write (bypasses membership access, which never grants
  // the director seat).
  await req.payload.create({
    collection: 'user-museum-memberships',
    data: { user: req.user.id, museum: doc.id, role: MUSEUM_FUNCTION_DIRECTOR },
    req,
  })
  forgetMuseumRoles(req)
  return doc
}

export const Museums: CollectionConfig = {
  slug: 'museums',
  access: {
    // The catalog is public; editing follows the per-museum hierarchy.
    read: anyone,
    create: authenticated,
    // Curators pass collection-level update; field access narrows them to the map.
    update: museumScoped(MUSEUM_FUNCTION_CURATOR),
    delete: museumScoped(MUSEUM_FUNCTION_DIRECTOR),
  },
  hooks: {
    beforeValidate: [richTextFromHtml(['description'])],
    beforeChange: [guardCuratorMapEdits, syncMuseumObjects],
    afterChange: [appointCreatorAsDirector],
  },
  fields: [
    ...[
      {
        name: 'name',
        type: 'text',
        required: true,
      } satisfies Field,
      editorial({ name: 'description', type: 'richText', required: false }),
      richTextHtmlInput('description'),
      editorial({ name: 'shortDescription', type: 'text', required: true, maxLength: 100 }),
      {
        name: 'accessibility',
        type: 'checkbox',
        virtual: true,
        required: true,
        // da rivedere quando si implementerà il modello dati per la mappa del museo
      } satisfies Field,
      phoneNumberField({
        name: 'phone',
        required: false,
      }),
      {
        name: 'email',
        type: 'email',
        required: false,
      } satisfies Field,
      SocialLinks,
      {
        name: 'news',
        type: 'array',
        required: false,
        fields: [
          editorial({ name: 'title', type: 'text', required: true }),
          editorial({ name: 'content', type: 'textarea', required: true }),
          {
            name: 'date',
            type: 'date',
            required: true,
          },
        ],
      } satisfies Field,
      {
        name: 'thumbnails',
        type: 'upload',
        relationTo: 'museumThumbnails',
        hasMany: true,
        required: false,
        minRows: 1,
        maxRows: 6,
      } satisfies Field,
      OpeningHours,
      TicketInfo,
      {
        name: 'location',
        type: 'group',
        required: true,
        fields: [
          {
            name: 'address',
            type: 'text',
            required: true,
          },
          {
            name: 'city',
            type: 'text',
            required: true,
            index: true,
          },
          {
            name: 'latlng',
            type: 'point',
            hidden: true,
            required: true,
          },
        ],
      } satisfies Field,
    ].map(directorOnly),
    {
      // Derived from `map` by `syncMuseumObjects`; read-only everywhere else.
      name: 'objects',
      type: 'relationship',
      relationTo: 'objects',
      hasMany: true,
      required: false,
      index: true,
      admin: { readOnly: true },
    },
    {
      // Reverse of `tours.museum`.
      name: 'tours',
      type: 'join',
      collection: 'tours',
      on: 'museum',
    },
    {
      // Director, curators and verified creators of this museum.
      name: 'staff',
      type: 'join',
      collection: 'user-museum-memberships',
      on: 'museum',
    },
    {
      name: 'map',
      type: 'json', // it is a pascal-editor json map representation
      required: false,
    },
    {
      name: 'navMesh',
      type: 'json',
      required: false,
      jsonSchema: {
        fileMatch: ['*'],
        uri: 'https://artaround.local/schemas/navmesh.json',
        schema: navMeshSchema as NonNullable<JSONField['jsonSchema']>['schema'],
      },
    },
    {
      // Older maps have only the walking mesh until they are saved again.
      name: 'navMeshWheelchair',
      type: 'json',
      required: false,
      jsonSchema: {
        fileMatch: ['*'],
        uri: 'https://artaround.local/schemas/navmesh-wheelchair.json',
        schema: navMeshSchema as NonNullable<JSONField['jsonSchema']>['schema'],
      },
    },
  ],
}

export const MuseumThumbnails: CollectionConfig = {
  slug: 'museumThumbnails',
  upload: true,
  access: {
    read: anyone,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [
    editorial({
      name: 'alt',
      type: 'text',
      required: true,
      defaultValue: 'Museum thumbnail image',
    }),
  ],
}

export const MuseumMaps: CollectionConfig = {
  slug: 'museumMaps',
  upload: true,
  access: {
    read: anyone,
    create: authenticated,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [],
}
