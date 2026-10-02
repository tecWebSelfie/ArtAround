import type { Role, User } from '@/payload-types'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

export function mockRole(overrides?: Partial<Role>): Role {
  return {
    id: 'role-001',
    code: 'curator',
    name: 'Curator',
    description: 'Manages museums and objects.',
    status: 'active',
    dataScope: 'own',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    ...overrides,
  }
}

export const mockRoleCurator: Role = mockRole()

export const mockRoleInactive: Role = mockRole({
  id: 'role-002',
  code: 'viewer',
  name: 'Viewer',
  status: 'inactive',
  dataScope: 'all',
})

function baseUser(): User {
  return {
    id: 'user-001',
    username: 'giulia.rossi',
    email: 'giulia.rossi@example.com',
    collection: 'users',
    roles: [],
    isSuperAdmin: false,
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
  }
}

export function createUser(overrides?: Partial<User>): User {
  return { ...baseUser(), ...overrides }
}

export const mockUserMinimal: User = createUser()

export const mockUserFull: User = createUser({
  id: 'user-full-001',
  username: 'mario.bianchi',
  email: 'mario.bianchi@example.com',
  isSuperAdmin: true,
  roles: [mockRoleCurator],
  parentPath: '/user-001',
  loginAttempts: 0,
})

export const mockUserNoEmail: User = createUser({
  id: 'user-noemail-001',
  username: 'walk-in-visitor',
  email: null,
})
