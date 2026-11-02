import type { User } from '@/payload-types'
import { isPopulated } from '@/lib/isPopulated'

/**
 * The signed-in visitor as the navigation bars show them. A plain module (no
 * 'use client', no 'server-only') so the server (`getSiteChrome`) and the
 * client (`useNavState`) build the entry with the same rule and never
 * disagree on the name or avatar.
 */
export type NavAccount = { id: string; name?: string | null; avatarUrl?: string | null }

export function toNavAccount(user: User): NavAccount {
  return {
    id: String(user.id),
    name: user.name?.fullName || user.username,
    avatarUrl: isPopulated(user.avatar) ? user.avatar.url : null,
  }
}
