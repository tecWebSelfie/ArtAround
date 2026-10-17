import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { Objects } from '@/collections/Objects'

function request({ granted = true, owner = 'editor', scope = 'own' } = {}) {
  return {
    user: { id: 'editor', roles: [{ id: 'role', dataScope: scope }] },
    payload: {
      findByID: vi.fn().mockResolvedValue({ id: 'object', createdBy: owner }),
      find: vi.fn(async ({ collection }: { collection: string }) => ({
        docs:
          collection === 'permissions'
            ? [{ id: 'permission' }]
            : collection === 'roles-permissions' && granted
              ? [{ id: 'grant' }]
              : [],
      })),
    },
  }
}

function access(operation: 'read' | 'create' | 'update' | 'delete', req: unknown) {
  return Objects.access![operation]!({ req: req as PayloadRequest, id: 'object' })
}

describe('objects access with the installed RBAC plugin', () => {
  it('allows anonymous reads without requiring an RBAC grant', async () => {
    const req = { user: null }
    expect(await access('read', req)).toBe(true)
  })

  it('allows authenticated readers without an RBAC grant', async () => {
    const req = request({ granted: false })
    expect(await access('read', req)).toBe(true)
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it.each(['create', 'update', 'delete'] as const)('denies anonymous %s', async (operation) => {
    expect(await access(operation, { ...request(), user: null })).toBe(false)
  })

  it.each(['create', 'update', 'delete'] as const)(
    'requires the seeded Object / %s permission for authenticated users',
    async (operation) => {
      const allowed = request()
      expect(await access(operation, allowed)).toBe(true)
      expect(allowed.payload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'permissions',
          where: {
            and: [
              { status: { equals: 'active' } },
              { 'permissionFeature.code': { equals: 'Object' } },
              {
                'permissionAction.code': {
                  equals: { create: 'Create', update: 'Update', delete: 'Delete' }[operation],
                },
              },
            ],
          },
        }),
      )
      expect(await access(operation, request({ granted: false }))).toBe(false)
    },
  )

  it.each(['update', 'delete'] as const)(
    'applies role ownership scope to %s using the objects collection slug',
    async (operation) => {
      const ownScope = request({ owner: 'someone-else' })
      expect(await access(operation, ownScope)).toBe(false)
      expect(ownScope.payload.findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'objects', id: 'object' }),
      )
      expect(await access(operation, request({ owner: 'someone-else', scope: 'all' }))).toBe(true)
    },
  )

  it.each(['create', 'update', 'delete'] as const)(
    'retains super-admin %s access without role grants',
    async (operation) => {
      const req = request({ granted: false, owner: 'someone-else' })
      expect(await access(operation, { ...req, user: { id: 'admin', isSuperAdmin: true } })).toBe(
        true,
      )
    },
  )
})
