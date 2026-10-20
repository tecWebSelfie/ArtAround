import { getT } from '@/i18n.server'
import { formatPrice, isLocked } from '@/lib/price'
import { getSession } from '@/lib/session'
import type { Content } from '@/payload-types'
import type { Route } from 'next'
import { LinkButton } from '@/components/editing/LinkButton'
import { LogIn } from 'lucide-react'
import { UnlockContentButton } from './UnlockContentButton'

/**
 * The acquisition action for a paid content the visitor cannot read yet. On a
 * locked content this replaces "Find it on the map": the next useful step is
 * buying it, not walking to it. Renders nothing for free or readable contents.
 *
 * Signed in: paid orange "Unlock for €…" starting Stripe Checkout for this
 * content. Anonymous: "Sign in to buy", returning to `next` afterwards.
 */
export async function ContentUnlock({
  content,
  lng,
  next,
}: {
  content: Pick<Content, 'id' | 'price' | 'body'>
  lng: string
  /** Where sign-in returns to (the page or modal showing the content). */
  next: string
}) {
  if (!isLocked(content)) return null
  const { user } = await getSession()
  const { t } = await getT('tour-page')
  const price = formatPrice(content.price ?? 0, lng)
  return user ? (
    <UnlockContentButton
      contentId={String(content.id)}
      label={t('Unlock for {{price}}', { price })}
    />
  ) : (
    <LinkButton
      href={`/${lng}/login?next=${encodeURIComponent(next)}` as Route}
      color="orange"
      autoContrast
      leftSection={<LogIn size={16} aria-hidden />}
      w={{ base: '100%', sm: 'auto' }}
    >
      {t('Sign in to buy')}
    </LinkButton>
  )
}
