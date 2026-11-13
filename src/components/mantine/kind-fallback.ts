import { ImageOff, UserRound } from 'lucide-react'
import type { CSSProperties } from 'react'

/**
 * What a document without a picture shows in its place (DESIGN.md →
 * Placeholder image): the usual muted "image unavailable" placeholder, a
 * neutral surface (`--image-placeholder`: white on light, dark.5 on dark,
 * with a hairline edge so it holds on a page of the same colour) and a
 * dimmed mark, rather than a broken image or a brand gradient competing with
 * real covers. Pictures get `ImageOff`; a person without a photo gets the
 * usual avatar silhouette. Shared by the marketplace cards, the detail-page
 * covers, the tour start page and the tour deck, so a missing picture looks
 * the same everywhere.
 */
const SURFACE: CSSProperties = {
  background: 'var(--image-placeholder)',
  color: 'var(--mantine-color-dimmed)',
  boxShadow: 'inset 0 0 0 1px var(--mantine-color-default-border)',
}

export const KIND_FALLBACK = {
  tour: { style: SURFACE, Icon: ImageOff },
  content: { style: SURFACE, Icon: ImageOff },
  user: { style: SURFACE, Icon: UserRound },
} as const
