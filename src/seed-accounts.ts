import type { RequiredDataFromCollectionSlug } from 'payload'

/**
 * The accounts the course specification requires in every seeded database:
 * two content authors and two visitors, all with the password `12345678`.
 * Shared by the base seed (`src/seed.ts`) and the demo museum seed
 * (`scripts/seed-demo-museum.ts`), whose contents the two authors write.
 * Users log in with the username or the email (`loginWithUsername` in
 * `src/collections/Users.ts`).
 */
export const PROJECT_PASSWORD = '12345678'

export const PROJECT_ACCOUNTS = [
  {
    username: 'autore1',
    email: 'autore1@artaround.example',
    password: PROJECT_PASSWORD,
    name: { firstName: 'Giulia', lastName: 'Fontana', fullName: 'Giulia Fontana' },
    bio: 'Art historian, writes about Gothic and Renaissance painting',
    description: 'Art historian, writes about Gothic and Renaissance painting',
  },
  {
    username: 'autore2',
    email: 'autore2@artaround.example',
    password: PROJECT_PASSWORD,
    name: { firstName: 'Marco', lastName: 'Lenzi', fullName: 'Marco Lenzi' },
    bio: 'Museum educator, writes for families and schools',
    description: 'Museum educator, writes for families and schools',
  },
  {
    username: 'visitatore1',
    email: 'visitatore1@artaround.example',
    password: PROJECT_PASSWORD,
    name: { firstName: 'Sara', lastName: 'Neri', fullName: 'Sara Neri' },
  },
  {
    username: 'visitatore2',
    email: 'visitatore2@artaround.example',
    password: PROJECT_PASSWORD,
    name: { firstName: 'Paolo', lastName: 'Riva', fullName: 'Paolo Riva' },
  },
] satisfies RequiredDataFromCollectionSlug<'users'>[]
