'use client'

import { Modal, ModalProps } from '@mantine/core'
import { useRouter } from 'next/navigation'

// Client shell for the object details modal. The body is passed as `children`
// from a Server Component (see `ObjectDetailsContent`): importing the async
// server module directly from here would leak `next/root-params` into the
// client bundle.
//
// Close is temporal on purpose: the intercepting route pushed one history
// entry when the modal opened, so router.back() retraces it, and Escape and
// outside click route through the same onClose — every dismissal returns to
// the page beneath (the overlay-close rule: Back must close what users
// perceive as a page). The other half of the rule is the map's
// NavigationModal, which closes structurally with replace because its
// shell's URL is the state. A deep link never opens this modal: the full
// object page serves it, with its own back.
export function ObjectModal({
  children,
  ...props
}: { children: React.ReactNode } & Omit<ModalProps, 'opened' | 'onClose'>) {
  const router = useRouter()
  // The close button's name comes from AppMantineProvider.
  return (
    <Modal opened {...props} onClose={() => router.back()}>
      {children}
    </Modal>
  )
}
