import type { SelectField } from 'payload'

/**
 * Per-museum role values, shared by the membership `role` field
 * (`user-museum-memberships`, the source of truth for every access rule in
 * `src/access/`), the user joins in `Users.ts` and the RBAC roles override
 * below.
 */
export const MUSEUM_FUNCTION_CURATOR = 'curator' as const
export const MUSEUM_FUNCTION_DIRECTOR = 'director' as const
// Per-museum "verified creator" badge: lets the holder sell contents tied to
// that museum. Stored as a membership like curator/director so every
// per-museum role lives in `user-museum-memberships`.
export const MUSEUM_FUNCTION_VERIFIED = 'verified' as const
export const MUSEUM_FUNCTION_NONE = 'none' as const

export type MuseumFunction =
  | typeof MUSEUM_FUNCTION_CURATOR
  | typeof MUSEUM_FUNCTION_DIRECTOR
  | typeof MUSEUM_FUNCTION_VERIFIED
  | typeof MUSEUM_FUNCTION_NONE

/** A role someone can hold in a museum (`user-museum-memberships.role`). */
export type MuseumRole = Exclude<MuseumFunction, typeof MUSEUM_FUNCTION_NONE>

/**
 * Per-museum hierarchy used by every access rule: a higher rank includes the
 * powers of the lower ones (a director can do what a curator can, …).
 */
export const MUSEUM_FUNCTION_RANK: Record<MuseumRole, number> = {
  [MUSEUM_FUNCTION_VERIFIED]: 1,
  [MUSEUM_FUNCTION_CURATOR]: 2,
  [MUSEUM_FUNCTION_DIRECTOR]: 3,
}

/**
 * To be appended to the `roles` collection via the RBAC plugin override
 * (`collections: { roles: { fields: [...] } }`). Fail-closed default:
 * a role with `none` grants no museum assignment.
 *
 * NOTE: memberships now carry their own `role`, so no access rule reads this
 * field anymore; it only labels the global RBAC roles in the admin panel.
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
