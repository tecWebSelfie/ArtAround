'use client'

import { Modal, ModalProps } from '@mantine/core'
import { useRouter } from 'next/navigation'

// Client shell for the object details modal. The body is passed as `children`
// from a Server Component (see `ObjectDetailsContent`): importing the async
// server module directly from here would leak `next/root-params` into the
// client bundle.
export function ObjectModal({
  children,
  ...props
}: { children: React.ReactNode } & Omit<ModalProps, 'opened' | 'onClose'>) {
  const router = useRouter()
  return (
    <Modal opened {...props} onClose={router.back}>
      {children}
    </Modal>
  )
}
