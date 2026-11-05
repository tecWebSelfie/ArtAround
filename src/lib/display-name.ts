import type { User } from '@/payload-types'

/**
 * The name a user is shown under: their full name, else first and last name,
 * else their username. One rule for marketplace cards, the search index and
 * content credits.
 */
export const displayName = (user: Pick<User, 'name' | 'username'>) =>
  user.name?.fullName ||
  [user.name?.firstName, user.name?.lastName].filter(Boolean).join(' ').trim() ||
  user.username
