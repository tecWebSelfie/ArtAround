import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Fields that must never be set by a public self-registration request.
 *
 * The RBAC plugin denies anonymous REST access on `users` by default, so the
 * collection opts `create` back in (see `Users.access.create`) to support
 * sign-up. That makes a public create payload reachable — this deny-list makes
 * sure only the handful of profile fields a visitor is allowed to choose
 * survive, and privilege flags / auth internals cannot be self-assigned.
 *
 * Only applies to `create`: updates still go through RBAC + field access.
 * Super admins (and any authenticated admin flow) are left untouched.
 */
const PRIVILEGED_USER_FIELDS = [
  'isSuperAdmin',
  'roles',
  'parent',
  'parentPath',
  'createdBy',
  'stripeID',
  'skipSync',
  'sessions',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'salt',
  'hash',
] as const

export const sanitizePublicSignup: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (operation !== 'create') {
    return data
  }

  // Trusted server-side calls (seed script, tests, custom server code) are not
  // public self-registration. `payloadAPI === 'local'` means the Local API was
  // used, where access control is intentionally bypassed by the caller.
  if (req.payloadAPI === 'local') {
    return data
  }

  // Trusted, authenticated admins keep full control (admin panel, seeds, …).
  // `req.user` can also be an MCP API key, which never carries `isSuperAdmin`.
  const actingUser = req.user as { isSuperAdmin?: boolean | null } | null
  if (actingUser?.isSuperAdmin) {
    return data
  }

  const sanitized = { ...(data ?? {}) } as Record<string, unknown>

  for (const field of PRIVILEGED_USER_FIELDS) {
    delete sanitized[field]
  }

  return sanitized as typeof data
}
