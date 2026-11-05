'use client'

import { Modal, Stack, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Signpost } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * The tour author's logistic directions for the stop the visitor is heading
 * to (`logisticNotes` in `src/lib/tour-logistics.ts`): the visit's practical
 * information before the first stop, then how to reach each stop. They sit in
 * the tour header, under the progress, whatever the directions strip shows
 * (asking for a position, the computed route): a short preview that opens
 * the full text.
 */
export function LogisticNotes({ notes }: { notes: string[] }) {
  const { t } = useTranslation('tour-navigation')
  const [opened, { open, close }] = useDisclosure(false)
  if (!notes.length) return null
  return (
    <>
      <UnstyledButton
        onClick={open}
        aria-haspopup="dialog"
        className="flex w-full items-start gap-2 rounded-md px-1 text-start"
      >
        <Signpost size={16} aria-hidden className="mt-0.5 shrink-0" />
        <Text size="xs" lineClamp={2}>
          {notes.join(' ')}
        </Text>
      </UnstyledButton>
      <Modal opened={opened} onClose={close} title={t('Directions from the tour')}>
        <Stack gap="sm">
          {notes.map((note) => (
            // Authors write paragraphs with line breaks: keep them.
            <Text key={note} size="sm" className="whitespace-pre-line">
              {note}
            </Text>
          ))}
        </Stack>
      </Modal>
    </>
  )
}
