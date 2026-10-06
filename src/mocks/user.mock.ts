import type { Role, User } from '@/payload-types'

import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
} from '@/fields/MuseumFunction'
import { mockContentMinimal, mockContentSecond, mockContentsList } from '@/mocks/content.mock'

const TIMESTAMP = '2026-01-15T10:00:00.000Z'

export function mockRole(overrides?: Partial<Role>): Role {
  return {
    id: 'role-001',
    code: 'curator',
    name: 'Curator',
    description: 'Manages museums and objects.',
    status: 'active',
    dataScope: 'own',
    museumFunction: MUSEUM_FUNCTION_CURATOR,
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    ...overrides,
  }
}

export const mockRoleCurator: Role = mockRole()

export const mockRoleUser: Role = mockRole({
  id: 'role-003',
  code: 'User',
  name: 'User',
  description: 'A logged in user, who can also create its own content and share it.',
  dataScope: 'own',
  museumFunction: MUSEUM_FUNCTION_NONE,
})

export const mockRoleDirector: Role = mockRole({
  id: 'role-004',
  code: 'Director',
  name: 'Director',
  description: 'A Museum director. He/Her owns the museum',
  dataScope: 'all',
  museumFunction: MUSEUM_FUNCTION_DIRECTOR,
})

export const mockRoleInactive: Role = mockRole({
  id: 'role-002',
  code: 'viewer',
  name: 'Viewer',
  status: 'inactive',
  dataScope: 'all',
  museumFunction: MUSEUM_FUNCTION_NONE,
})

// Mirrors the `name` group on the users collection: `fullName` is a virtual
// field derived by an afterRead hook from firstName + lastName.
function mockName(firstName: string, lastName: string): User['name'] {
  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' '),
  }
}

function baseUser(): User {
  return {
    id: 'user-001',
    username: 'giulia.rossi',
    email: 'giulia.rossi@example.com',
    collection: 'users',
    roles: [],
    isSuperAdmin: false,
    name: mockName('Giulia', 'Rossi'),
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    bio: 'User bio goes here. It can be a short description of the user, their interests, or any other relevant information.',
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
  name: mockName('Mario', 'Bianchi'),
  avatar: {
    id: 'avatar-001',
    alt: 'Ritratto di Mario Bianchi',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    url: 'https://picsum.photos/200/300',
    filename: 'mario-bianchi.jpg',
    mimeType: 'image/jpeg',
    width: 512,
    height: 512,
  },
  parentPath: '/user-001',
  loginAttempts: 0,
})

export const mockUserNoEmail: User = createUser({
  id: 'user-noemail-001',
  username: 'walk-in-visitor',
  email: null,
  name: mockName('Walk-in', 'Visitor'),
})

// Verified creator without curation rights: active non-curator role plus
// authored contents. Renders the verified badge but no curator badge.
export const mockUserVerifiedCreator: User = createUser({
  id: 'user-creator-001',
  username: 'elena.verdi',
  email: 'elena.verdi@example.com',
  roles: [mockRoleUser],
  name: mockName('Elena', 'Verdi'),
  authoredContents: [mockContentMinimal],
})

// Verified through authored contents alone: no roles, not a super-admin.
// Exercises the authored-contents branch of isVerifiedCreator.
export const mockUserAuthor: User = createUser({
  id: 'user-author-001',
  username: 'paolo.neri',
  email: 'paolo.neri@example.com',
  roles: [],
  name: mockName('Paolo', 'Neri'),
  authoredContents: [mockContentSecond],
  avatar: {
    id: 'avatar-002',
    alt: 'Ritratto di Paolo Neri',
    updatedAt: TIMESTAMP,
    createdAt: TIMESTAMP,
    url: 'https://picsum.photos/200/300',
    filename: 'paolo-neri.jpg',
    mimeType: 'image/jpeg',
    width: 512,
    height: 512,
  },
})

// Curator without a museum list: renders the generic Curator badge.
export const mockUserCurator: User = createUser({
  id: 'user-curator-001',
  username: 'sara.blu',
  email: 'sara.blu@example.com',
  roles: [mockRoleCurator],
  name: mockName('Sara', 'Blu'),
})

// Director: curation rights like a curator, exercised with a museum list.
export const mockUserDirector: User = createUser({
  id: 'user-director-001',
  username: 'luca.grigi',
  email: 'luca.grigi@example.com',
  roles: [mockRoleDirector],
  name: mockName('Luca', 'Grigi'),
})

// Inactive roles grant nothing: no badges, empty contents.
export const mockUserInactiveRole: User = createUser({
  id: 'user-inactive-001',
  username: 'anna.gialli',
  email: 'anna.gialli@example.com',
  roles: [mockRoleInactive],
  name: mockName('Anna', 'Gialli'),
})

// Unpopulated relationship IDs degrade gracefully: no badges, empty contents.
export const mockUserUnpopulatedRefs: User = createUser({
  id: 'user-unpop-001',
  username: 'ghost.refs',
  email: 'ghost.refs@example.com',
  roles: ['role-unknown'],
  name: mockName('Ghost', 'Refs'),
  authoredContents: ['content-unknown'],
})

// Prolific author: several authored contents in the contents tab.
export const mockUserManyContents: User = createUser({
  id: 'user-prolific-001',
  username: 'marco.prolifico',
  email: 'marco.prolifico@example.com',
  roles: [mockRoleUser],
  name: mockName('Marco', 'Prolifico'),
  authoredContents: mockContentsList,
})
