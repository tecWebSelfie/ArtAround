import { Content } from '@/payload-types'
import { Alert, Modal, ModalProps } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Lock } from 'lucide-react'

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

/**
 * Content body for pages and tour modals. A paid content read by someone not
 * entitled to it arrives without `body` (field access on `contents.body`),
 * so the locked notice replaces the text instead of rendering nothing.
 */
export function ContentDetailsModalContent({
  content,
  lockedLabel = 'This content is paid. Unlock it to read the full text.',
}: {
  content: Content
  lockedLabel?: string
}) {
  return (
    <div>
      <h2>{content.title}</h2>
      {content.body ? (
        <RichText data={content.body} />
      ) : (
        <Alert color="orange" icon={<Lock size={16} />}>
          {lockedLabel}
        </Alert>
      )}
    </div>
  )
}
