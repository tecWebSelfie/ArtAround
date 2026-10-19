'use client'

import { payloadSdk } from '@/payload-sdk'
import { Button, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { Trash2 } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { errorMessage } from './saving'

/**
 * Confirmed delete for contents and tours. Shown only when the server says
 * the visitor may delete (`can(…, 'delete')`); Payload re-checks on the call.
 * Objects are never offered here: only super admins delete them.
 */
export function DeleteDocumentButton({
  collection,
  id,
  name,
  redirectTo,
}: {
  collection: 'contents' | 'tours'
  id: string
  name: string
  redirectTo: Route
}) {
  const { t } = useTranslation('editing')
  const router = useRouter()

  const confirm = () =>
    modals.openConfirmModal({
      title: t('Delete “{{name}}”?', { name }),
      centered: true,
      children: <Text size="sm">{t('This cannot be undone.')}</Text>,
      labels: { confirm: t('Delete'), cancel: t('Cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await payloadSdk.delete({ collection, id })
          notifications.show({ message: t('Deleted') })
          router.push(redirectTo)
          router.refresh()
        } catch (error) {
          notifications.show({
            color: 'red',
            title: t('Could not delete'),
            message: errorMessage(error),
          })
        }
      },
    })

  return (
    <Button variant="subtle" color="red" leftSection={<Trash2 size={16} />} onClick={confirm}>
      {t('Delete')}
    </Button>
  )
}
