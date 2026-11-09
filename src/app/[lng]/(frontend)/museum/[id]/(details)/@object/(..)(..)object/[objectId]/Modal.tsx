'use client'

import { Modal, ModalProps } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

// Client shell for the object details modal. The body is passed as `children`
// from a Server Component (see `ObjectDetailsContent`): importing the async
// server module directly from here would leak `next/root-params` into the
// client bundle.
export function ObjectModal({
  children,
  ...props
}: { children: React.ReactNode } & Omit<ModalProps, 'opened' | 'onClose'>) {
  const router = useRouter()
  const { t } = useTranslation('common')
  // The close button is an icon: it needs its name for screen readers.
  return (
    <Modal opened closeButtonProps={{ 'aria-label': t('Close') }} {...props} onClose={router.back}>
      {children}
    </Modal>
  )
}
