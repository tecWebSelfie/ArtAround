import { DeleteDocumentButton } from '@/components/editing/DeleteDocumentButton'
import { EditableSection } from '@/components/editing/EditableSection'
import { ContentMetadataForm } from '@/components/editing/forms/ContentMetadataForm'
import { LinkButton } from '@/components/editing/LinkButton'
import { ContentDetailsModalContent } from '@/components/mantine/ContentDetailsModal'
import { getT } from '@/i18n.server'
import { getLocalizedPageDocument } from '@/lib/localized-page'
import { can, getSession } from '@/lib/session'
import { Container, Group } from '@mantine/core'
import { FileText } from 'lucide-react'
import type { Route } from 'next'

/**
 * Canonical content page. The author edits metadata in place and the text on
 * `/content/:id/edit`; the author or museum staff above the author's rank may
 * delete it (`can(…, 'delete')` mirrors the moderation rule).
 */
export default async function Content({ params }: PageProps<'/[lng]/content/[id]'>) {
  const { lng, id } = await params
  const content = await getLocalizedPageDocument('contents', id, lng)
  const [canEdit, canDelete] = await Promise.all([
    can('contents', id, 'update'),
    can('contents', id, 'delete'),
  ])
  const { payload } = await getSession()
  const source = canEdit
    ? await payload.findByID({
        collection: 'contents',
        id,
        locale: 'en',
        depth: 0,
        select: { title: true, difficulty: true, copyright: true, price: true },
      })
    : null
  const { t } = await getT('editing')

  return (
    <Container size="md" py="md">
      <EditableSection
        title={t('Content')}
        canEdit={canEdit}
        form={source && <ContentMetadataForm content={{ ...source, id }} />}
      >
        <ContentDetailsModalContent
          content={content}
          lockedLabel={t('This content is paid. Unlock it to read the full text.')}
        />
      </EditableSection>
      {(canEdit || canDelete) && (
        <Group mt="md" gap="xs">
          {canEdit && (
            <LinkButton
              href={`/${lng}/content/${id}/edit` as Route}
              variant="light"
              leftSection={<FileText size={16} />}
            >
              {t('Edit text')}
            </LinkButton>
          )}
          {canDelete && (
            <DeleteDocumentButton
              collection="contents"
              id={id}
              name={content.title}
              redirectTo={`/${lng}/navigator` as Route}
            />
          )}
        </Group>
      )}
    </Container>
  )
}
