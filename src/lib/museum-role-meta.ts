import type { MuseumRole } from '@/fields/MuseumFunction'
import { BadgeCheck, Landmark, Palette, type LucideIcon } from 'lucide-react'

/**
 * The icon of each per-museum role wherever the app names it (the profile
 * badges, the "Your museums" page), always next to the role in words, never
 * alone. Server- and client-safe; the words are translated where they are
 * shown, so `i18next-cli extract` sees each key.
 */
export const MUSEUM_ROLE_ICON: Record<MuseumRole, LucideIcon> = {
  director: Landmark,
  curator: Palette,
  verified: BadgeCheck,
}

/** A museum where the signed-in visitor holds a per-museum role. */
export type MyMuseum = { id: string; name: string; role: MuseumRole }
