'use client'

import { Modal } from '@mantine/core'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { tourNavigationPath, withNavigationPosition } from '@/lib/tour-navigation'
import { useTranslation } from 'react-i18next'

/** Shared modal shell so closing a detail returns to the current tour URL and state. */
export function NavigationModal({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { lng, id: tourId, stepId } = useParams<{ lng: string; id: string; stepId: string }>()
  const search = useSearchParams()
  const { t } = useTranslation('tour-navigation')

  return (
    <Modal
      opened
      title={t('Museum content')}
      closeButtonProps={{ 'aria-label': t('Close') }}
      onClose={() =>
        router.replace(
          withNavigationPosition(
            tourNavigationPath(lng, tourId, Number(stepId)),
            search.toString(),
          ),
        )
      }
    >
      {children}
    </Modal>
  )
}
