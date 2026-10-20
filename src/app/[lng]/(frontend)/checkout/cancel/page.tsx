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
  return (
    <CheckoutOutcome
      title={t('Checkout cancelled')}
      description={t('No payment was taken. You can unlock it whenever you like.')}
      action={{
        label: back.isTour ? t('Back to the tour') : t('Back to the navigator'),
        href: back.href,
      }}
    />
  )
}
