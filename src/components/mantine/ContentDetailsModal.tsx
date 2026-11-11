import { Content } from '@/payload-types'
import { ContentAudioButton } from '@/components/mantine/ContentAudioButton'
import { DurationBadge } from '@/components/mantine/DurationBadge'
import { Alert, Group, Modal, ModalProps, Stack, Title, Typography } from '@mantine/core'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'

export const ContentDetailsModal = ({
  content,
  lng,
  ...props
}: { content: Content; lng: string } & Omit<ModalProps, 'content'>) => {
  return (
    <Modal {...props}>
      <ContentDetailsModalContent content={content} lng={lng} />
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
 * length and the "Listen" button (the text read aloud, a client island) sit
 * under it, and the rich text gets Mantine's typography
 * at a ~68ch measure so long texts stay comfortable to read.
 */
export function ContentDetailsModalContent({
  content,
  lng,
  lockedLabel = 'This content is paid. Unlock it to read the full text.',
  headingOrder = 2,
  glance,
}: {
  content: Content
  /** Page language, for the length label ("2 min 30 sec"). */
  lng: string
  lockedLabel?: string
  /** `h1` on the content page; `h2` under a dialog's own title. */
  headingOrder?: 1 | 2
  /** The page's at-a-glance badges (`ContentGlance`), shown before the text. */
  glance?: ReactNode
}) {
  return (
    <Stack gap="sm">
      <Title order={headingOrder} size="h2" className="text-balance">
        {content.title}
      </Title>
      {content.durationSeconds || content.body ? (
        <Group gap="xs">
          {content.durationSeconds ? (
            <DurationBadge
              seconds={content.durationSeconds}
              lng={lng}
              variant="light"
              color="gray"
            />
          ) : null}
          {content.body ? <ContentAudioButton contentId={String(content.id)} /> : null}
        </Group>
      ) : null}
      {glance}
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
