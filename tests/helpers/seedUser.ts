import { getPayload, RequiredDataFromCollectionSlug } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  username: 'dev',
  name: { firstName: 'Dev', lastName: 'User', fullName: 'Dev User' },
  // Only super admins may open the admin panel (`Users.access.admin`).
  isSuperAdmin: true,
} satisfies RequiredDataFromCollectionSlug<'users'>

/** Set when `seedTestUser` created the user, so cleanup removes only its own. */
let createdByTest = false

/**
 * Ensures the admin test user exists. Its email is the seeded super admin's
 * (`src/seed.ts`), which other e2e specs log in as: an existing user is
 * reused (password and super admin flag reset to the known values) rather
 * than deleted, so running the admin spec never wipes the dev database's
 * admin out from under the rest of the suite.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: testUser.email } },
    limit: 1,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: { password: testUser.password, isSuperAdmin: true },
    })
    createdByTest = false
    return
  }

  await payload.create({
    collection: 'users',
    data: testUser,
  })
  createdByTest = true
}

/**
 * Removes the test user, but only if `seedTestUser` created it.
 */
export async function cleanupTestUser(): Promise<void> {
  if (!createdByTest) return
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
  createdByTest = false
}
