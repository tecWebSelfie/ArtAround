import { getT } from '@/i18n.server'
import { CheckoutOutcome } from '../CheckoutOutcome'
import { checkoutReturn } from '../return-path'

/** Landing page when the buyer backs out of Stripe Checkout. Nothing was charged. */
export default async function CheckoutCancel(props: {
  params: Promise<{ lng: string }>
  searchParams: Promise<{ collection?: string | string[]; id?: string | string[] }>
}) {
  const { lng } = await props.params
  const back = checkoutReturn(lng, await props.searchParams)
  const { t } = await getT('checkout')
  let backLabel = t('Back to the navigator')
  if (back.isTour) backLabel = t('Back to the tour')
  else if (back.target?.collection === 'contents') backLabel = t('Back to the content')
  return (
    <CheckoutOutcome
      title={t('Checkout cancelled')}
      description={t('No payment was taken. You can unlock it whenever you like.')}
      action={{
        label: backLabel,
        href: back.href,
      }}
    />
  )
}
