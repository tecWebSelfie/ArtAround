'use client'

import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import type { Content } from '@/payload-types'
import { getLocalizedDoc } from '@/payload-sdk'
import { Alert, Drawer, Loader, Stack } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "Read the content again" from the quiz or its results, without leaving the
 * page (and the visitor's place in it). Uses the public localized-read contract
 * (`getLocalizedDoc`), which serves the English fallback while a translation is
 * queued, like every other content view.
 */
export function QuizContentDrawer({
  contentId,
  lng,
  onClose,
}: {
  contentId: string | null
  lng: string
  onClose: () => void
}) {
  const { t } = useTranslation('tour-quiz')
  const [state, setState] = useState<
    { id: string; content: Content } | { id: string; error: true } | null
  >(null)

  useEffect(() => {
    if (!contentId) return
    const controller = new AbortController()
    getLocalizedDoc(
      { collection: 'contents', id: contentId, locale: lng },
      { signal: controller.signal },
    )
      .then((result) =>
        setState(
          'doc' in result ? { id: contentId, content: result.doc } : { id: contentId, error: true },
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState({ id: contentId, error: true })
      })
    return () => controller.abort()
  }, [contentId, lng])

  // Ignore a previous content's state while the new one loads.
  const current = state?.id === contentId ? state : null

  return (
    <Drawer
      opened={contentId !== null}
      onClose={onClose}
      position="right"
      size="lg"
      title={t('Read the content again')}
      closeButtonProps={{ 'aria-label': t('Close') }}
    >
      {!current ? (
        <Stack align="center" py="xl">
          <Loader aria-label={t('Loading content')} />
        </Stack>
      ) : 'error' in current ? (
        <Alert color="red">{t('This content could not be loaded.')}</Alert>
      ) : (
        <ContentDetailsModalContent content={current.content} />
      )}
    </Drawer>
  )
}
