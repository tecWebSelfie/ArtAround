import { Content } from '@/payload-types'
import { Modal, ModalProps } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'

export const ContentDetailsModal = ({
  content,
  ...props
}: { content: Content } & Omit<ModalProps, 'content'>) => {
  return (
    <Modal {...props}>
      {' '}
      <ContentDetailsModalContent content={content} />{' '}
    </Modal>
  )
}

export function ContentDetailsModalContent({ content }: { content: Content }) {
  return (
    <div>
      <h2>{content.title}</h2>
      <RichText data={content.body} />
    </div>
  )
}
