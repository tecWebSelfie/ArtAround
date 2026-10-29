import { Box, Image } from '@mantine/core'
import { KIND_FALLBACK } from './kind-fallback'

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
   * What to show without a picture: the kind's gradient and mark
   * (`KIND_FALLBACK`, as on marketplace cards), so the page still opens on its
   * cover rather than a grey "no image" frame.
   */
  fallback: 'tour' | 'content'
}) {
  if (src) {
    return <Image src={src} alt={alt ?? ''} h={COVER_HEIGHT} w="100%" fit="cover" radius="lg" />
  }
  const { background, Icon } = KIND_FALLBACK[fallback]
  return (
    // Decorative: the title right below names the tour or content.
    <Box
      h={COVER_HEIGHT}
      aria-hidden
      bdrs="lg"
      c="white"
      style={{ background }}
      className="flex items-center justify-center"
    >
      <Icon size="30%" strokeWidth={1.5} />
    </Box>
  )
}
