import { Info, LogIn, LogOut, ShoppingBag, Toilet, Utensils, type LucideIcon } from 'lucide-react'
import {
  EXIT_ENTRANCE_DIRECTIONS,
  type ExitEntranceDirection,
} from './ExitEntranceNode'
import { SERVICE_TYPES, type ServiceType } from './ServiceNode'

/**
 * Icon, Mantine color and 3D color for every museum marker kind. Single source
 * shared by the map-editor toolbar/panel, the museum page badges, the tour
 * navigation buttons/spotlight and the in-scene renderers so a service always
 * reads the same everywhere (the colors match the original `MuseumBadges`).
 */
export type MarkerMeta = {
  Icon: LucideIcon
  /** Mantine color name — used by badges, avatars and action icons. */
  color: string
  /** Same color as a hex literal — three.js materials can't take Mantine names. */
  hex: string
  /** English fallback label; translated surfaces key off the service/direction. */
  label: string
}

export const SERVICE_META: Record<ServiceType, MarkerMeta> = {
  bathrooms: { Icon: Toilet, color: 'blue', hex: '#228be6', label: 'Toilets' },
  food: { Icon: Utensils, color: 'green', hex: '#40c057', label: 'Food' },
  infoPoint: { Icon: Info, color: 'orange', hex: '#fd7e14', label: 'Info point' },
  shop: { Icon: ShoppingBag, color: 'red', hex: '#fa5252', label: 'Shop' },
}

export const EXIT_ENTRANCE_META: Record<ExitEntranceDirection, MarkerMeta> = {
  // Entrances read blue, exits light red — the exit plate uses the lighter hex
  // so it does not compete with the many red service markers.
  entrance: { Icon: LogIn, color: 'blue', hex: '#228be6', label: 'Entrance' },
  exit: { Icon: LogOut, color: 'red', hex: '#ff8787', label: 'Exit' },
}

/** Narrow a raw string to a known service id (URL params, stored JSON). */
export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === 'string' && (SERVICE_TYPES as readonly string[]).includes(value)
}

export function isExitEntranceDirection(value: unknown): value is ExitEntranceDirection {
  return (
    typeof value === 'string' && (EXIT_ENTRANCE_DIRECTIONS as readonly string[]).includes(value)
  )
}
