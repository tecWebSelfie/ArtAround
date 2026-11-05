import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { Objects } from '@/collections/Objects'

/**
 * A signed-in editor: `memberships` are their per-museum roles, which
 * `getMuseumRoles` reads from `user-museum-memberships` (cached in `context`).
 */
function request({ memberships = [] as { museum: string; role: string }[] } = {}) {
  return {
    user: { id: 'editor' },
    context: {},
    payload: {
      find: vi.fn(async ({ collection }: { collection: string }) => ({
        docs: collection === 'user-museum-memberships' ? memberships : [],
      })),
    },
  }
}

/** One membership in museum `m1` with `role`, or none for a plain user. */
const staff = (role: string | null) => (role ? [{ museum: 'm1', role }] : [])

function access(operation: 'read' | 'create' | 'update' | 'delete', req: unknown) {
  return Objects.access![operation]!({ req: req as PayloadRequest, id: 'object' })
}

describe('objects access with per-museum roles', () => {
  it('allows anonymous reads', async () => {
    const req = { user: null }
    expect(await access('read', req)).toBe(true)
  })

  it('allows authenticated readers without reading their roles', async () => {
    const req = request()
    expect(await access('read', req)).toBe(true)
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it.each(['create', 'update', 'delete'] as const)('denies anonymous %s', async (operation) => {
    expect(await access(operation, { ...request(), user: null })).toBe(false)
  })

  // Per-museum roles (docs/permissions-and-editing.md), no longer the RBAC grants.
  it.each([
    ['curator', true],
    ['verified', false],
    [null, false],
  ] as const)('creating objects as %s: %s', async (role, allowed) => {
    expect(await access('create', request({ memberships: staff(role) }))).toBe(allowed)
  })

  it('lets only the owner update an object, through a query on createdBy', async () => {
    expect(await access('update', request())).toEqual({ createdBy: { equals: 'editor' } })
  })

  it('keeps deletion to super admins, even for museum staff', async () => {
    expect(await access('delete', request({ memberships: staff('director') }))).toBe(false)
  })

  it.each(['create', 'update', 'delete'] as const)(
    'retains super-admin %s access without museum roles',
    async (operation) => {
      const req = request()
      expect(await access(operation, { ...req, user: { id: 'admin', isSuperAdmin: true } })).toBe(
        true,
      )
    },
  )
})
