'use client'

import { Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import type { Route } from 'next'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useGroup } from './GroupProvider'

/**
 * Leaving and ending a group both ask first, with the same Mantine confirm
 * modal the rest of the app uses. Leaving keeps the visitor on the tour, on
 * their own from where they are; ending closes the room for everyone.
 */
export function useGroupExit() {
  const { t } = useTranslation('group')
  const group = useGroup()
  const router = useRouter()
  const { lng } = useParams<{ lng: string }>()

  const confirmLeave = () =>
    modals.openConfirmModal({
      title: t('Leave the group?'),
      centered: true,
      children: <Text size="sm">{t('You will continue the tour on your own.')}</Text>,
      labels: { confirm: t('Leave'), cancel: t('Stay') },
      onConfirm: () => group?.leave(),
    })

  const confirmEnd = () =>
    modals.openConfirmModal({
      title: t('End the group tour?'),
      centered: true,
      children: <Text size="sm">{t('Everyone leaves the group and continues on their own.')}</Text>,
      labels: { confirm: t('End for everyone'), cancel: t('Cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await group?.end()
        router.push(`/${lng}/navigator` as Route)
      },
    })

  return { confirmLeave, confirmEnd }
}
