'use client'

import { Content } from '@/payload-types'
import { Modal, ModalProps, Stack, Title } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'

export function StepModal({
  step: content,
  ...props
}: { step: Content } & Omit<ModalProps, 'step'>) {
  return (
    <Modal
      {...props}
      opened
      title={content.title}
      closeButtonProps={{ 'aria-label': 'Chiudi il contenuto' }}
    >
      <Stack justify="space-evenly" align="center">
        <Title>{content.title}</Title>
        <RichText data={content.body} />
      </Stack>
    </Modal>
  )
}
