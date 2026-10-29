import { Box, Image } from '@mantine/core'
import { BookOpen, Map } from 'lucide-react'

/** Each kind's identity colour and mark (DESIGN.md → Colors): tour gradient, content teal. */
const FALLBACK = {
  tour: {
    Icon: Map,
    className: 'from-(--mantine-color-grape-6) to-(--mantine-color-orange-4)',
  },
  content: {
    Icon: BookOpen,
    className: 'from-(--mantine-color-teal-5) to-(--mantine-color-teal-8)',
  },
} as const

/**
 * The picture that opens a detail page (tour, content): it leads the page but
 * is capped in height, so on landing the title, the at-a-glance facts and the
 * start of the text still fit above the fold on a phone, while the page's main
 * action waits in the fixed footer (DESIGN.md → The Thumb-Reach Rule).
 *
 * `clamp(160px, 32dvh, 360px)`: about a third of the screen on any phone
 * (≈270px at 844px tall), never a sliver on a short landscape screen and never
 * a wall on a tall desktop. Hook-free, so server pages can render it.
 */
const COVER_HEIGHT = 'clamp(160px, 32dvh, 360px)'

export function DetailCover({
  src,
  alt,
  fallback,
}: {
  src?: string | null
  alt?: string | null
  /**
   * What to show without a picture: the kind's identity colour with its mark
   * (the tour one as on the tour start page), so the page still opens on its
   * cover rather than a grey "no image" frame.
   */
  fallback: keyof typeof FALLBACK
}) {
  if (src) {
    return <Image src={src} alt={alt ?? ''} h={COVER_HEIGHT} w="100%" fit="cover" radius="lg" />
  }
  const { Icon, className } = FALLBACK[fallback]
  return (
    // Decorative: the title right below names the tour or content.
    <Box
      h={COVER_HEIGHT}
      aria-hidden
      className={`flex items-center justify-center rounded-(--mantine-radius-lg) bg-linear-135 text-white ${className}`}
    >
      <Icon size="30%" strokeWidth={1.5} />
    </Box>
  )
}
