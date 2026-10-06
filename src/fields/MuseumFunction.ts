import type { SelectField } from 'payload'

/**
 * What a role means for museums, regardless of its `code`/`name`
 * (which stay free labels editable from the admin UI).
 * Single source of truth shared by the RBAC override in
 * `payload.config.ts`, the membership joins in `Users.ts` and `seed.ts`.
 */
export const MUSEUM_FUNCTION_CURATOR = 'curator' as const
export const MUSEUM_FUNCTION_DIRECTOR = 'director' as const
export const MUSEUM_FUNCTION_NONE = 'none' as const

export type MuseumFunction =
  | typeof MUSEUM_FUNCTION_CURATOR
  | typeof MUSEUM_FUNCTION_DIRECTOR
  | typeof MUSEUM_FUNCTION_NONE

/**
 * To be appended to the `roles` collection via the RBAC plugin override
 * (`collections: { roles: { fields: [...] } }`). Fail-closed default:
 * a role with `none` grants no museum assignment.
 */
export const museumFunctionField: SelectField = {
  name: 'museumFunction',
  type: 'select',
  required: true,
  defaultValue: MUSEUM_FUNCTION_NONE,
  options: [
    { label: 'Curator', value: MUSEUM_FUNCTION_CURATOR },
    { label: 'Director', value: MUSEUM_FUNCTION_DIRECTOR },
    { label: 'None', value: MUSEUM_FUNCTION_NONE },
  ],
  admin: {
    description: 'Museum function granted by this role, independent of its code/name.',
  },
}
