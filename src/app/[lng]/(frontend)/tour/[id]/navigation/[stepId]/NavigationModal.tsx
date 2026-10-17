'use client'

import { Modal } from '@mantine/core'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function NavigationModal({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <Modal opened onClose={router.back}>
      {children}
    </Modal>
  )
}
