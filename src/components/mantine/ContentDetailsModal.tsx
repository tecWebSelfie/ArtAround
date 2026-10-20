import { Content } from '@/payload-types'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Alert, Group, Modal, ModalProps, Stack, Title, Typography } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Lock } from 'lucide-react'

export const ContentDetailsModal = ({
  content,
  ...props
}: { content: Content } & Omit<ModalProps, 'content'>) => {
  return (
    <Modal {...props}>
      <ContentDetailsModalContent content={content} />
    </Modal>
  )
}

/**
 * Content body for pages and tour modals. A paid content read by someone not
 * entitled to it arrives without `body` (field access on `contents.body`),
 * so the locked notice replaces the text instead of rendering nothing.
 *
 * Hook-free (server pages render it too). The title is a real Mantine
 * heading (a bare `<h2>` is reset to body text by Tailwind's preflight), the
 * reading time sits under it, and the rich text gets Mantine's typography
 * at a ~68ch measure so long texts stay comfortable to read.
 */
export function ContentDetailsModalContent({
  content,
  lockedLabel = 'This content is paid. Unlock it to read the full text.',
}: {
  content: Content
  lockedLabel?: string
}) {
  return (
    <Stack gap="sm">
      <Title order={2} className="text-balance">
        {content.title}
      </Title>
      {content.readingTimeMins ? (
        <Group gap="xs">
          <DurationBadge time={content.readingTimeMins} variant="light" color="gray" />
        </Group>
      ) : null}
      {content.body ? (
        <Typography maw="68ch">
          <RichText data={content.body} />
        </Typography>
      ) : (
        <Alert color="orange" icon={<Lock size={16} />}>
          {lockedLabel}
        </Alert>
      )}
    </Stack>
  )
}
